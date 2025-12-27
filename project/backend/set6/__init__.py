"""
SET-6: AI-Powered Network Subnetting System

Hybrid system combining deterministic VLSM algorithms with Groq AI reasoning
for intelligent subnet allocation and explanation generation.
"""

from .subnet_engine import allocate_subnets, validate_subnet_request
from .ai_reasoner import SubnetAIReasoner
from .models import SubnetDesignRequest, SubnetDesignResponse

__all__ = [
    'allocate_subnets',
    'validate_subnet_request',
    'SubnetAIReasoner',
    'SubnetDesignRequest',
    'SubnetDesignResponse'
]
