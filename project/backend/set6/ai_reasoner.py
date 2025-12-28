"""
AI Reasoning Layer using Groq API for intelligent subnet design.

This module handles:
- Natural language parsing
- Qualitative constraint interpretation
- Host count estimation
- Branch prioritization
- Explanation generation

The AI layer NEVER performs actual IP calculations - only reasoning and interpretation.
"""

import os
import json
import logging
from typing import List, Dict, Tuple, Optional
from groq import Groq
from .models import BranchRequirement, SubnetDesignRequest, NaturalLanguageRequest

logger = logging.getLogger(__name__)


class SubnetAIReasoner:
    """AI reasoning layer for subnet design using Groq API"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize AI reasoner with Groq.
        
        Args:
            api_key: Groq API key (optional, defaults to env var)
        """
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("Groq API key not available. Set GROQ_API_KEY environment variable.")
        
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.1-8b-instant"
        
        logger.info(f"AI Reasoner initialized with Groq model: {self.model}")
    
    def parse_natural_language(self, nl_input: str) -> SubnetDesignRequest:
        """
        Parse natural language input into structured subnet request.
        
        Example:
            "Design subnets for 192.168.0.0/16 with Finance (200 users), 
             IT (100 devices), Guest WiFi"
             
        Returns:
            SubnetDesignRequest object
        """
        logger.info(f"Parsing natural language input: {nl_input[:100]}...")
        
        prompt = f"""You are an expert network engineer. Parse this subnet design request into structured JSON.

INPUT: {nl_input}

Extract:
1. Base IP address (e.g., "192.168.0.0")
2. CIDR block (e.g., 16)
3. Growth buffer percentage (default 0.3 if not mentioned)
4. List of branches/departments

For each branch extract:
- name: Department/branch name
- hosts_needed: Explicit number if mentioned (null if not)
- description: Qualitative description or context
- priority: 1 (high), 2 (medium), or 3 (low) based on keywords like "critical", "guest", etc.

Return ONLY valid JSON in this exact format:
{{
    "base_ip": "x.x.x.x",
    "cidr": number,
    "growth_buffer": 0.3,
    "branches": [
        {{
            "name": "Branch Name",
            "hosts_needed": number or null,
            "description": "description text",
            "priority": 1 or 2 or 3
        }}
    ]
}}

CRITICAL: Return ONLY the JSON, no markdown, no explanation."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,  # Low temperature for consistent parsing
                max_tokens=2000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Remove markdown if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()
            
            # Parse JSON
            parsed = json.loads(content)
            
            logger.info(f"Successfully parsed NL input into {len(parsed.get('branches', []))} branches")
            
            # Convert to Pydantic model
            return SubnetDesignRequest(**parsed)
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"AI response was: {content}")
            raise ValueError(f"AI returned invalid JSON: {e}")
        
        except Exception as e:
            logger.error(f"Error in NL parsing: {e}")
            raise
    
    def estimate_hosts(self, description: str, branch_name: str = "") -> int:
        """
        Estimate required host count from qualitative description.
        
        Examples:
            "small office" -> 30
            "large datacenter" -> 1000
            "IoT sensors" -> 500
        """
        logger.info(f"Estimating hosts for: {branch_name} - {description}")
        
        prompt = f"""You are a network planning expert. Estimate the number of hosts/devices needed.

Branch: {branch_name}
Description: {description}

Based on typical network deployments, estimate a reasonable host count.

Guidelines:
- "Small office/branch": 20-50
- "Medium office": 100-200
- "Large office": 300-500
- "Datacenter": 200-1000
- "IoT/sensors": 100-2000 (depends on scale)
- "Guest WiFi": 30-100
- "Server farm": 50-500

Return ONLY a single integer number, nothing else."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=50
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract number
            host_count = int(content)
            
            logger.info(f"Estimated {host_count} hosts for '{branch_name}'")
            
            return max(1, host_count)  # Ensure at least 1
        
        except Exception as e:
            logger.warning(f"Failed to estimate hosts, using default: {e}")
            return 100  # Safe default
    
    def enrich_branches(self, branches: List[BranchRequirement], growth_buffer: float) -> List[BranchRequirement]:
        """
        Enrich branches with AI-estimated host counts where missing.
        
        Args:
            branches: List of branch requirements
            growth_buffer: Growth buffer percentage
            
        Returns:
            Enriched branches with host counts
        """
        enriched = []
        
        for branch in branches:
            if branch.hosts_needed is None and branch.description:
                # Use AI to estimate
                estimated = self.estimate_hosts(branch.description, branch.name)
                
                # Create new branch with estimated hosts
                enriched_branch = BranchRequirement(
                    name=branch.name,
                    hosts_needed=estimated,
                    description=branch.description,
                    priority=branch.priority
                )
                enriched.append(enriched_branch)
                
                logger.info(f"Enriched '{branch.name}' with {estimated} estimated hosts")
            else:
                enriched.append(branch)
        
        return enriched
    
    def generate_explanation(
        self, 
        branch_name: str,
        network_address: str,
        cidr: int,
        usable_hosts: int,
        original_hosts: int,
        hosts_with_buffer: int,
        description: str,
        security_zone: str,
        growth_buffer_pct: float
    ) -> str:
        """
        Generate AI explanation for subnet allocation decision.
        
        Args:
            branch_name: Name of the branch
            network_address: Allocated network address
            cidr: CIDR prefix
            usable_hosts: Number of usable IPs
            original_hosts: Original host requirement
            hosts_with_buffer: Hosts after applying buffer
            description: Branch description
            security_zone: Assigned security zone
            growth_buffer_pct: Growth buffer percentage
            
        Returns:
            Professional explanation string
        """
        prompt = f"""You are a senior network architect. Explain this subnet allocation decision to a network administrator.

Subnet Allocation:
- Branch: {branch_name}
- Network: {network_address}/{cidr}
- Usable IPs: {usable_hosts}
- Required hosts: {original_hosts}
- With {int(growth_buffer_pct*100)}% growth buffer: {hosts_with_buffer}
- Description: {description}
- Security Zone: {security_zone}

Write a concise, professional explanation (2-3 sentences) covering:
1. Why this subnet size was chosen
2. How it accommodates current needs and growth
3. Any security or best practice considerations

Keep it clear and actionable. No markdown, no bullet points."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                max_tokens=200
            )
            
            explanation = response.choices[0].message.content.strip()
            
            logger.debug(f"Generated explanation for {branch_name}")
            
            return explanation
        
        except Exception as e:
            logger.warning(f"Failed to generate AI explanation: {e}")
            # Fallback to template explanation
            return (
                f"Allocated /{cidr} subnet to accommodate {original_hosts} hosts "
                f"with {int(growth_buffer_pct*100)}% growth buffer ({hosts_with_buffer} hosts total). "
                f"This provides {usable_hosts} usable IPs with room for expansion."
            )
    
    def generate_recommendations(
        self,
        allocated_subnets: List[Dict],
        base_network: str,
        utilization_pct: float
    ) -> List[str]:
        """
        Generate AI-powered recommendations for the subnet design.
        
        Args:
            allocated_subnets: List of allocated subnet details
            base_network: Base network CIDR
            utilization_pct: Network utilization percentage
            
        Returns:
            List of recommendation strings
        """
        # Build context
        subnet_summary = "\n".join([
            f"- {s['branch_name']}: /{s['cidr']} in {s['security_zone']} zone (VLAN {s.get('vlan_id', 'N/A')})"
            for s in allocated_subnets
        ])
        
        prompt = f"""You are a network security and best practices expert. Review this subnet design and provide 3-5 actionable recommendations.

Network: {base_network}
Utilization: {utilization_pct}%

Allocated Subnets:
{subnet_summary}

Provide specific, actionable recommendations for:
- Network security hardening
- VLAN configuration
- Firewall rules
- Monitoring and access control
- Future scalability

Return as a JSON array of strings. Each recommendation should be one clear sentence.
Format: ["recommendation 1", "recommendation 2", ...]"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.6,
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse JSON array
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()
            
            recommendations = json.loads(content)
            
            logger.info(f"Generated {len(recommendations)} recommendations")
            
            return recommendations
        
        except Exception as e:
            logger.warning(f"Failed to generate recommendations: {e}")
            # Fallback recommendations
            return [
                "Implement VLAN tagging to enforce network isolation between security zones",
                "Configure firewall rules to restrict traffic between Restricted and Guest zones",
                "Enable DHCP snooping and dynamic ARP inspection on all VLANs",
                "Implement 802.1X authentication for internal networks",
                "Monitor network utilization and plan for expansion when reaching 70% capacity"
            ]
    
    def generate_summary(
        self,
        num_subnets: int,
        base_network: str,
        total_allocated: int,
        total_available: int,
        utilization_pct: float
    ) -> str:
        """
        Generate executive summary of subnet allocation.
        
        Returns:
            Summary string
        """
        return (
            f"Successfully allocated {num_subnets} non-overlapping subnet{'s' if num_subnets != 1 else ''} "
            f"from {base_network}. Total IPs used: {total_allocated:,} of {total_available:,} available "
            f"({utilization_pct}% utilization)."
        )
