"""
Utility functions for subnet calculations
"""

import ipaddress
import math
from typing import Tuple


def calculate_prefix_length(host_count: int) -> int:
    """
    Calculate the minimum prefix length needed for the given host count.
    
    Formula: prefix = 32 - ceil(log2(hosts + 2))
    The +2 accounts for network and broadcast addresses.
    
    Args:
        host_count: Number of hosts needed
        
    Returns:
        Prefix length (e.g., 24 for /24)
    """
    if host_count < 1:
        raise ValueError("Host count must be at least 1")
    
    # Add 2 for network and broadcast addresses
    total_needed = host_count + 2
    
    # Calculate bits needed: ceil(log2(total_needed))
    bits_needed = math.ceil(math.log2(total_needed))
    
    # Prefix length is 32 - bits_needed
    prefix = 32 - bits_needed
    
    # Ensure valid range
    return max(1, min(30, prefix))


def get_subnet_details(network: ipaddress.IPv4Network) -> dict:
    """
    Extract detailed information from an IPv4 network.
    
    Args:
        network: IPv4Network object
        
    Returns:
        Dictionary with subnet details
    """
    # Get all host addresses (excluding network and broadcast)
    hosts = list(network.hosts())
    
    return {
        'network_address': str(network.network_address),
        'broadcast_address': str(network.broadcast_address),
        'subnet_mask': str(network.netmask),
        'cidr': network.prefixlen,
        'total_hosts': network.num_addresses,
        'usable_hosts': len(hosts),
        'first_usable': str(hosts[0]) if hosts else str(network.network_address),
        'last_usable': str(hosts[-1]) if hosts else str(network.broadcast_address),
        'gateway_suggestion': str(hosts[0]) if hosts else str(network.network_address)
    }


def apply_growth_buffer(host_count: int, buffer_percentage: float) -> int:
    """
    Apply growth buffer to host count.
    
    Args:
        host_count: Original host count
        buffer_percentage: Buffer as decimal (0.3 for 30%)
        
    Returns:
        Host count with buffer applied
    """
    return math.ceil(host_count * (1 + buffer_percentage))


def calculate_network_utilization(allocated_subnets: list, base_network: ipaddress.IPv4Network) -> dict:
    """
    Calculate network utilization statistics.
    
    Args:
        allocated_subnets: List of allocated IPv4Network objects
        base_network: The parent network
        
    Returns:
        Dictionary with utilization stats
    """
    total_available = base_network.num_addresses
    total_allocated = sum(subnet.num_addresses for subnet in allocated_subnets)
    
    return {
        'total_available': total_available,
        'total_allocated': total_allocated,
        'total_free': total_available - total_allocated,
        'utilization_percentage': round((total_allocated / total_available) * 100, 2)
    }


def check_subnet_fits(current_address: ipaddress.IPv4Address, 
                      prefix_length: int, 
                      base_network: ipaddress.IPv4Network) -> bool:
    """
    Check if a subnet of given size fits in the base network starting at current_address.
    
    Args:
        current_address: Starting address for the subnet
        prefix_length: Required prefix length
        base_network: Parent network
        
    Returns:
        True if subnet fits, False otherwise
    """
    try:
        # Create the potential subnet
        potential_subnet = ipaddress.IPv4Network(f"{current_address}/{prefix_length}", strict=False)
        
        # Check if it's entirely within the base network
        return potential_subnet.subnet_of(base_network)
    except:
        return False


def get_next_network_address(current_network: ipaddress.IPv4Network) -> ipaddress.IPv4Address:
    """
    Get the next available network address after the current subnet.
    
    Args:
        current_network: Current allocated network
        
    Returns:
        Next available IP address
    """
    # Next address is broadcast + 1
    return current_network.broadcast_address + 1


def suggest_security_zone(branch_name: str, description: str = "") -> str:
    """
    Suggest security zone based on branch name and description.
    
    Args:
        branch_name: Name of the branch
        description: Optional description
        
    Returns:
        Security zone name
    """
    name_lower = branch_name.lower()
    desc_lower = description.lower()
    
    # High security zones
    if any(keyword in name_lower or keyword in desc_lower 
           for keyword in ['finance', 'hr', 'executive', 'legal', 'compliance', 'security']):
        return "Restricted"
    
    # IoT/OT zones
    if any(keyword in name_lower or keyword in desc_lower 
           for keyword in ['iot', 'sensor', 'camera', 'scada', 'industrial', 'automation']):
        return "IoT_Isolated"
    
    # Guest/public zones
    if any(keyword in name_lower or keyword in desc_lower 
           for keyword in ['guest', 'visitor', 'public', 'wifi']):
        return "Guest_DMZ"
    
    # Server zones
    if any(keyword in name_lower or keyword in desc_lower 
           for keyword in ['server', 'datacenter', 'data center', 'infrastructure']):
        return "Server_Zone"
    
    # Default internal
    return "Internal"


def suggest_vlan_id(branch_name: str, security_zone: str, index: int) -> int:
    """
    Suggest VLAN ID based on security zone and index.
    
    Args:
        branch_name: Name of the branch
        security_zone: Security zone
        index: Index in allocation order
        
    Returns:
        Suggested VLAN ID
    """
    # Standard VLAN ID ranges by security zone
    zone_base = {
        "Restricted": 20,
        "Server_Zone": 50,
        "Internal": 10,
        "IoT_Isolated": 30,
        "Guest_DMZ": 99
    }
    
    base = zone_base.get(security_zone, 100)
    
    # For guest, always return 99
    if security_zone == "Guest_DMZ":
        return 99
    
    # Otherwise, return base + index
    return base + index
