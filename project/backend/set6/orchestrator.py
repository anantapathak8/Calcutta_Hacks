"""
Main orchestrator for AI-powered subnet design.

This module coordinates between:
- Deterministic subnet engine (subnet_engine.py)
- AI reasoning layer (ai_reasoner.py)

Flow:
1. Accept structured or NL input
2. Use AI to enrich/parse input if needed
3. Run deterministic subnet allocation
4. Use AI to generate explanations and recommendations
5. Return comprehensive results
"""

import os
import logging
import ipaddress
from typing import Tuple
from .models import (
    SubnetDesignRequest, 
    SubnetDesignResponse, 
    AllocatedSubnet,
    NaturalLanguageRequest
)
from .subnet_engine import allocate_subnets, validate_subnet_request
from .ai_reasoner import SubnetAIReasoner
from .utils import calculate_network_utilization

logger = logging.getLogger(__name__)


class SubnetDesignOrchestrator:
    """Orchestrates AI-powered subnet design workflow"""
    
    def __init__(self, groq_api_key: str = None):
        """
        Initialize orchestrator.
        
        Args:
            groq_api_key: Groq API key (optional, defaults to env var)
        """
        self.ai_reasoner = SubnetAIReasoner(api_key=groq_api_key)
        logger.info("Subnet Design Orchestrator initialized")
    
    def design_from_natural_language(self, nl_input: str) -> SubnetDesignResponse:
        """
        Design subnets from natural language description.
        
        Args:
            nl_input: Natural language description
            
        Returns:
            SubnetDesignResponse
        """
        try:
            logger.info("Processing natural language input")
            
            # Step 1: Parse NL into structured request
            request = self.ai_reasoner.parse_natural_language(nl_input)
            
            # Step 2: Process as structured request
            return self.design_from_structured(request)
        
        except Exception as e:
            logger.error(f"Error in NL subnet design: {e}", exc_info=True)
            return SubnetDesignResponse(
                success=False,
                summary="",
                error=f"Failed to process natural language input: {str(e)}"
            )
    
    def design_from_structured(self, request: SubnetDesignRequest) -> SubnetDesignResponse:
        """
        Design subnets from structured request.
        
        This is the main workflow:
        1. Enrich branches with AI (estimate hosts from descriptions)
        2. Run deterministic subnet allocation
        3. Generate AI explanations for each subnet
        4. Generate recommendations
        5. Return comprehensive response
        
        Args:
            request: Structured subnet design request
            
        Returns:
            SubnetDesignResponse
        """
        try:
            logger.info(f"Designing subnets for {request.base_ip}/{request.cidr}")
            
            # Step 1: Enrich branches with AI-estimated host counts
            enriched_branches = self.ai_reasoner.enrich_branches(
                request.branches, 
                request.growth_buffer
            )
            
            # Update request with enriched branches
            enriched_request = SubnetDesignRequest(
                base_ip=request.base_ip,
                cidr=request.cidr,
                branches=enriched_branches,
                growth_buffer=request.growth_buffer,
                enable_vlan_suggestions=request.enable_vlan_suggestions
            )
            
            # Step 2: Validate request
            is_valid, error_msg = validate_subnet_request(enriched_request)
            if not is_valid:
                return SubnetDesignResponse(
                    success=False,
                    summary="",
                    error=error_msg
                )
            
            # Step 3: Run deterministic subnet allocation
            allocated_subnets, warnings = allocate_subnets(enriched_request)
            
            logger.info(f"Allocated {len(allocated_subnets)} subnets")
            
            # Step 4: Generate AI explanations for each subnet
            for subnet in allocated_subnets:
                explanation = self.ai_reasoner.generate_explanation(
                    branch_name=subnet['branch_name'],
                    network_address=subnet['network_address'],
                    cidr=subnet['cidr'],
                    usable_hosts=subnet['usable_hosts'],
                    original_hosts=subnet.get('_original_hosts', 0),
                    hosts_with_buffer=subnet.get('_hosts_with_buffer', 0),
                    description=subnet.get('_description', ''),
                    security_zone=subnet['security_zone'],
                    growth_buffer_pct=request.growth_buffer
                )
                subnet['ai_reasoning'] = explanation
                
                # Remove internal fields
                subnet.pop('_original_hosts', None)
                subnet.pop('_hosts_with_buffer', None)
                subnet.pop('_description', None)
            
            # Step 5: Calculate network utilization
            base_network = ipaddress.IPv4Network(f"{request.base_ip}/{request.cidr}")
            allocated_networks = [
                ipaddress.IPv4Network(f"{s['network_address']}/{s['cidr']}") 
                for s in allocated_subnets
            ]
            utilization = calculate_network_utilization(allocated_networks, base_network)
            
            # Step 6: Generate summary
            summary = self.ai_reasoner.generate_summary(
                num_subnets=len(allocated_subnets),
                base_network=f"{request.base_ip}/{request.cidr}",
                total_allocated=utilization['total_allocated'],
                total_available=utilization['total_available'],
                utilization_pct=utilization['utilization_percentage']
            )
            
            # Step 7: Generate AI recommendations
            recommendations = self.ai_reasoner.generate_recommendations(
                allocated_subnets=allocated_subnets,
                base_network=f"{request.base_ip}/{request.cidr}",
                utilization_pct=utilization['utilization_percentage']
            )
            
            # Step 8: Convert to Pydantic models
            subnet_models = [AllocatedSubnet(**subnet) for subnet in allocated_subnets]
            
            logger.info("Subnet design completed successfully")
            
            return SubnetDesignResponse(
                success=True,
                subnets=subnet_models,
                summary=summary,
                warnings=warnings,
                recommendations=recommendations
            )
        
        except Exception as e:
            logger.error(f"Error in subnet design: {e}", exc_info=True)
            return SubnetDesignResponse(
                success=False,
                summary="",
                error=str(e)
            )


# Singleton instance
_orchestrator = None

def get_orchestrator() -> SubnetDesignOrchestrator:
    """Get or create singleton orchestrator instance"""
    global _orchestrator
    if _orchestrator is None:
        groq_api_key = os.getenv('GROQ_API_KEY')
        _orchestrator = SubnetDesignOrchestrator(groq_api_key=groq_api_key)
    return _orchestrator
