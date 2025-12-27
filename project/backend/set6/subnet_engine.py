"""
Core subnet calculation engine using deterministic VLSM algorithms.

This module handles all IP address mathematics and subnet allocation.
NO AI is involved in the actual calculations - only deterministic algorithms.
"""

import ipaddress
import logging
from typing import List, Dict, Tuple
from .models import BranchRequirement, SubnetDesignRequest, AllocatedSubnet
from .utils import (
    calculate_prefix_length,
    get_subnet_details,
    apply_growth_buffer,
    calculate_network_utilization,
    check_subnet_fits,
    get_next_network_address,
    suggest_security_zone,
    suggest_vlan_id
)

logger = logging.getLogger(__name__)


class SubnetRequirement:
    """Internal class to track subnet requirements during allocation"""
    def __init__(self, branch: BranchRequirement, hosts_with_buffer: int, prefix_length: int):
        self.branch = branch
        self.hosts_with_buffer = hosts_with_buffer
        self.prefix_length = prefix_length
        self.original_hosts = branch.hosts_needed or 0
        
    def __repr__(self):
        return f"SubnetRequirement(branch={self.branch.name}, hosts={self.hosts_with_buffer}, prefix=/{self.prefix_length})"


def calculate_subnet_requirements(
    branches: List[BranchRequirement], 
    growth_buffer: float
) -> List[SubnetRequirement]:
    """
    Calculate exact subnet requirements for each branch.
    
    This is a deterministic calculation that converts host counts
    into required prefix lengths.
    
    Args:
        branches: List of branch requirements
        growth_buffer: Growth buffer percentage (e.g., 0.3 for 30%)
        
    Returns:
        List of SubnetRequirement objects sorted by size (largest first)
    """
    requirements = []
    
    for branch in branches:
        if branch.hosts_needed is None:
            # This will be handled by AI reasoner later
            # For now, skip or use a default
            logger.warning(f"Branch '{branch.name}' has no hosts_needed - will be estimated by AI")
            continue
        
        # Apply growth buffer
        hosts_with_buffer = apply_growth_buffer(branch.hosts_needed, growth_buffer)
        
        # Calculate required prefix length
        prefix = calculate_prefix_length(hosts_with_buffer)
        
        requirements.append(SubnetRequirement(branch, hosts_with_buffer, prefix))
    
    # Sort by prefix length (ascending) = largest subnets first
    # /22 comes before /24 because it's a larger subnet
    requirements.sort(key=lambda r: r.prefix_length)
    
    logger.info(f"Calculated requirements for {len(requirements)} branches")
    for req in requirements:
        logger.info(f"  {req.branch.name}: /{req.prefix_length} ({req.hosts_with_buffer} hosts with buffer)")
    
    return requirements


def allocate_subnets_deterministic(
    base_ip: str,
    cidr: int,
    requirements: List[SubnetRequirement]
) -> Tuple[List[Dict], List[str]]:
    """
    Allocate subnets using deterministic VLSM algorithm.
    
    This function performs the actual subnet allocation. It is completely
    deterministic - no AI involvement. This ensures:
    - No IP address hallucination
    - No overlapping subnets
    - Mathematically correct calculations
    
    Args:
        base_ip: Base network IP address
        cidr: CIDR block
        requirements: List of subnet requirements (sorted largest first)
        
    Returns:
        Tuple of (allocated_subnets, warnings)
        
    Raises:
        ValueError: If allocation is impossible
    """
    # Create base network
    try:
        base_network = ipaddress.IPv4Network(f"{base_ip}/{cidr}", strict=False)
    except ValueError as e:
        raise ValueError(f"Invalid base network: {e}")
    
    logger.info(f"Allocating subnets from {base_network}")
    
    allocated = []
    warnings = []
    current_address = base_network.network_address
    
    for idx, req in enumerate(requirements):
        # Check if subnet fits
        if not check_subnet_fits(current_address, req.prefix_length, base_network):
            # Calculate how much space would be needed
            total_needed = sum(2 ** (32 - r.prefix_length) for r in requirements)
            available = base_network.num_addresses
            
            error_msg = (
                f"Insufficient IP space in {base_network}. "
                f"Need {total_needed} IPs, but only {available} available. "
                f"Failed at branch '{req.branch.name}' (/{req.prefix_length}). "
                f"Suggest using larger CIDR block or reducing host requirements."
            )
            raise ValueError(error_msg)
        
        # Allocate subnet
        subnet = ipaddress.IPv4Network(f"{current_address}/{req.prefix_length}", strict=False)
        
        # Get detailed information
        details = get_subnet_details(subnet)
        
        # Determine security zone
        security_zone = suggest_security_zone(
            req.branch.name, 
            req.branch.description or ""
        )
        
        # Suggest VLAN ID
        vlan_id = suggest_vlan_id(req.branch.name, security_zone, idx)
        
        # Create allocated subnet info
        allocated_subnet = {
            'branch_name': req.branch.name,
            'network_address': details['network_address'],
            'cidr': details['cidr'],
            'subnet_mask': details['subnet_mask'],
            'usable_ip_range': f"{details['first_usable']} - {details['last_usable']}",
            'broadcast_address': details['broadcast_address'],
            'total_hosts': details['total_hosts'],
            'usable_hosts': details['usable_hosts'],
            'gateway_suggestion': details['gateway_suggestion'],
            'vlan_id': vlan_id,
            'security_zone': security_zone,
            'priority': req.branch.priority,
            # AI reasoning will be added later
            'ai_reasoning': "",
            # Store for AI context
            '_original_hosts': req.original_hosts,
            '_hosts_with_buffer': req.hosts_with_buffer,
            '_description': req.branch.description or ""
        }
        
        allocated.append(allocated_subnet)
        
        logger.info(f"Allocated: {req.branch.name} -> {subnet}")
        
        # Move to next available address
        current_address = get_next_network_address(subnet)
    
    # Verify no overlaps (safety check)
    verify_no_overlaps([ipaddress.IPv4Network(f"{s['network_address']}/{s['cidr']}") 
                        for s in allocated])
    
    # Calculate utilization
    allocated_networks = [ipaddress.IPv4Network(f"{s['network_address']}/{s['cidr']}") 
                          for s in allocated]
    utilization = calculate_network_utilization(allocated_networks, base_network)
    
    logger.info(
        f"Allocation complete: {len(allocated)} subnets, "
        f"{utilization['utilization_percentage']}% utilization"
    )
    
    # Add warnings if utilization is high
    if utilization['utilization_percentage'] > 80:
        warnings.append(
            f"High network utilization ({utilization['utilization_percentage']}%). "
            f"Consider using a larger CIDR block for future growth."
        )
    
    return allocated, warnings


def verify_no_overlaps(subnets: List[ipaddress.IPv4Network]) -> None:
    """
    Verify that no subnets overlap.
    
    This is a safety check to ensure our algorithm produces valid results.
    
    Args:
        subnets: List of IPv4Network objects
        
    Raises:
        AssertionError: If any subnets overlap
    """
    for i, subnet1 in enumerate(subnets):
        for subnet2 in subnets[i+1:]:
            if subnet1.overlaps(subnet2):
                raise AssertionError(
                    f"CRITICAL: Subnet overlap detected! {subnet1} overlaps with {subnet2}. "
                    f"This should never happen - algorithm error."
                )
    logger.info("Overlap verification passed - all subnets are non-overlapping")


def validate_subnet_request(request: SubnetDesignRequest) -> Tuple[bool, str]:
    """
    Validate a subnet design request.
    
    Args:
        request: Subnet design request
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        # Validate base network
        base_network = ipaddress.IPv4Network(f"{request.base_ip}/{request.cidr}", strict=False)
        
        # Check if we have enough space for minimum allocation
        min_hosts_needed = 0
        for branch in request.branches:
            if branch.hosts_needed:
                hosts_with_buffer = apply_growth_buffer(branch.hosts_needed, request.growth_buffer)
                min_hosts_needed += hosts_with_buffer + 2  # +2 for network and broadcast
        
        if min_hosts_needed > base_network.num_addresses:
            return False, (
                f"Insufficient IP space. Base network {base_network} provides "
                f"{base_network.num_addresses} IPs, but minimum {min_hosts_needed} needed."
            )
        
        return True, ""
    
    except Exception as e:
        return False, f"Validation error: {str(e)}"


def allocate_subnets(request: SubnetDesignRequest) -> Tuple[List[Dict], List[str]]:
    """
    Main entry point for subnet allocation.
    
    This function performs deterministic subnet allocation without AI.
    AI reasoning is added separately by the AI reasoner module.
    
    Args:
        request: Subnet design request
        
    Returns:
        Tuple of (allocated_subnets, warnings)
    """
    # Validate request
    is_valid, error_msg = validate_subnet_request(request)
    if not is_valid:
        raise ValueError(error_msg)
    
    # Calculate requirements
    requirements = calculate_subnet_requirements(request.branches, request.growth_buffer)
    
    if not requirements:
        raise ValueError("No valid subnet requirements. Ensure branches have hosts_needed specified.")
    
    # Allocate subnets
    allocated, warnings = allocate_subnets_deterministic(
        request.base_ip,
        request.cidr,
        requirements
    )
    
    return allocated, warnings
