"""
Pydantic models for subnet design system
"""

from typing import List, Optional
from pydantic import BaseModel, Field, validator
import ipaddress


class BranchRequirement(BaseModel):
    """Represents a network branch/department requiring a subnet"""
    name: str = Field(..., description="Branch/department name")
    hosts_needed: Optional[int] = Field(None, description="Number of hosts required")
    description: Optional[str] = Field(None, description="Qualitative description for AI interpretation")
    priority: Optional[int] = Field(None, ge=1, le=3, description="Priority level (1=high, 2=medium, 3=low)")
    
    @validator('name')
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Branch name cannot be empty')
        return v.strip()
    
    @validator('hosts_needed')
    def hosts_valid(cls, v):
        if v is not None and v < 1:
            raise ValueError('hosts_needed must be at least 1')
        return v


class SubnetDesignRequest(BaseModel):
    """Request for subnet design"""
    base_ip: str = Field(..., description="Base network IP address")
    cidr: int = Field(..., ge=8, le=30, description="CIDR block size")
    branches: List[BranchRequirement] = Field(..., min_items=1, description="List of branches requiring subnets")
    growth_buffer: float = Field(0.3, ge=0.0, le=1.0, description="Growth buffer percentage (default 30%)")
    enable_vlan_suggestions: bool = Field(True, description="Enable AI VLAN ID suggestions")
    natural_language_input: Optional[str] = Field(None, description="Natural language description (alternative input method)")
    
    @validator('base_ip')
    def validate_ip(cls, v):
        try:
            network = ipaddress.IPv4Network(v, strict=False)
            return str(network.network_address)
        except ValueError as e:
            raise ValueError(f'Invalid IP address: {e}')
    
    @validator('branches')
    def branches_not_empty(cls, v):
        if not v:
            raise ValueError('At least one branch is required')
        # Check each branch has either hosts_needed or description
        for branch in v:
            if branch.hosts_needed is None and not branch.description:
                raise ValueError(f'Branch "{branch.name}" must have either hosts_needed or description')
        return v


class AllocatedSubnet(BaseModel):
    """Represents an allocated subnet with full details"""
    branch_name: str
    network_address: str
    cidr: int
    subnet_mask: str
    usable_ip_range: str
    broadcast_address: str
    total_hosts: int
    usable_hosts: int
    gateway_suggestion: str
    ai_reasoning: str
    vlan_id: Optional[int] = None
    security_zone: Optional[str] = None
    priority: Optional[int] = None


class SubnetDesignResponse(BaseModel):
    """Response containing allocated subnets"""
    success: bool
    subnets: List[AllocatedSubnet] = []
    summary: str
    warnings: List[str] = []
    recommendations: List[str] = []
    error: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "subnets": [
                    {
                        "branch_name": "Engineering",
                        "network_address": "192.168.0.0",
                        "cidr": 24,
                        "subnet_mask": "255.255.255.0",
                        "usable_ip_range": "192.168.0.1 - 192.168.0.254",
                        "broadcast_address": "192.168.0.255",
                        "total_hosts": 256,
                        "usable_hosts": 254,
                        "gateway_suggestion": "192.168.0.1",
                        "ai_reasoning": "Allocated /24 subnet for 200 hosts with 30% growth buffer",
                        "vlan_id": 10,
                        "security_zone": "Internal"
                    }
                ],
                "summary": "Successfully allocated 1 subnet",
                "warnings": [],
                "recommendations": ["Enable VLAN tagging"]
            }
        }


class NaturalLanguageRequest(BaseModel):
    """Request with natural language input"""
    natural_language_input: str = Field(..., description="Natural language description of subnet requirements")
    
    @validator('natural_language_input')
    def nl_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Natural language input cannot be empty')
        return v.strip()
