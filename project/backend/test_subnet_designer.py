"""
Test script for the AI-Powered Subnet Designer

This script tests the core functionality:
1. Subnet calculation engine
2. AI reasoning (if Groq API available)
3. End-to-end workflow
"""

import os
import sys
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_subnet_calculations():
    """Test deterministic subnet calculations"""
    print("=" * 60)
    print("TEST 1: Subnet Calculation Engine")
    print("=" * 60)
    
    from set6.subnet_engine import calculate_prefix_length, allocate_subnets
    from set6.models import SubnetDesignRequest, BranchRequirement
    from set6.utils import get_subnet_details
    import ipaddress
    
    # Test prefix calculation
    print("\n1.1 Testing prefix length calculation:")
    test_cases = [
        (10, 28),   # 10 hosts needs /28 (16 IPs, 14 usable)
        (50, 26),   # 50 hosts needs /26 (64 IPs, 62 usable)
        (100, 25),  # 100 hosts needs /25 (128 IPs, 126 usable)
        (500, 23),  # 500 hosts needs /23 (512 IPs, 510 usable)
    ]
    
    all_passed = True
    for hosts, expected_prefix in test_cases:
        result = calculate_prefix_length(hosts)
        status = "✅" if result == expected_prefix else "❌"
        print(f"  {status} {hosts} hosts -> /{result} (expected /{expected_prefix})")
        if result != expected_prefix:
            all_passed = False
    
    # Test subnet details extraction
    print("\n1.2 Testing subnet details extraction:")
    test_network = ipaddress.IPv4Network('192.168.0.0/24')
    details = get_subnet_details(test_network)
    print(f"  Network: {details['network_address']}")
    print(f"  Broadcast: {details['broadcast_address']}")
    print(f"  Usable hosts: {details['usable_hosts']}")
    print(f"  Gateway suggestion: {details['gateway_suggestion']}")
    
    # Test full allocation
    print("\n1.3 Testing full subnet allocation:")
    request = SubnetDesignRequest(
        base_ip="10.0.0.0",
        cidr=16,
        growth_buffer=0.2,
        branches=[
            BranchRequirement(name="Engineering", hosts_needed=300),
            BranchRequirement(name="Sales", hosts_needed=100),
            BranchRequirement(name="Guest", hosts_needed=50)
        ]
    )
    
    try:
        subnets, warnings = allocate_subnets(request)
        print(f"  ✅ Successfully allocated {len(subnets)} subnets")
        for subnet in subnets:
            print(f"    - {subnet['branch_name']}: {subnet['network_address']}/{subnet['cidr']}")
        
        if warnings:
            print(f"  ⚠️  Warnings: {warnings}")
    except Exception as e:
        print(f"  ❌ Allocation failed: {e}")
        all_passed = False
    
    return all_passed


def test_ai_reasoning():
    """Test AI reasoning layer (requires Groq API key)"""
    print("\n" + "=" * 60)
    print("TEST 2: AI Reasoning Layer")
    print("=" * 60)
    
    groq_key = os.getenv('GROQ_API_KEY')
    if not groq_key:
        print("  ⚠️  Skipping AI tests - GROQ_API_KEY not set")
        return True
    
    try:
        from set6.ai_reasoner import SubnetAIReasoner
        
        print("\n2.1 Testing AI initialization:")
        reasoner = SubnetAIReasoner(api_key=groq_key)
        print("  ✅ AI reasoner initialized successfully")
        
        print("\n2.2 Testing host estimation:")
        test_cases = [
            ("small office branch", "Office"),
            ("IoT sensor network with 500 devices", "IoT"),
            ("guest WiFi for visitors", "Guest")
        ]
        
        for description, branch_name in test_cases:
            try:
                estimated = reasoner.estimate_hosts(description, branch_name)
                print(f"  ✅ '{description}' -> {estimated} hosts")
            except Exception as e:
                print(f"  ❌ Failed to estimate: {e}")
                return False
        
        print("\n2.3 Testing natural language parsing:")
        nl_input = "Design subnets for 192.168.0.0/16 with Finance (200 users) and IT (100 devices)"
        try:
            parsed = reasoner.parse_natural_language(nl_input)
            print(f"  ✅ Parsed {len(parsed.branches)} branches from NL input")
            for branch in parsed.branches:
                print(f"    - {branch.name}: {branch.hosts_needed or 'AI estimated'} hosts")
        except Exception as e:
            print(f"  ❌ NL parsing failed: {e}")
            return False
        
        return True
    
    except Exception as e:
        print(f"  ❌ AI reasoning test failed: {e}")
        return False


def test_end_to_end():
    """Test complete end-to-end workflow"""
    print("\n" + "=" * 60)
    print("TEST 3: End-to-End Workflow")
    print("=" * 60)
    
    groq_key = os.getenv('GROQ_API_KEY')
    if not groq_key:
        print("  ⚠️  Skipping E2E test - GROQ_API_KEY not set")
        return True
    
    try:
        from set6.orchestrator import SubnetDesignOrchestrator
        from set6.models import SubnetDesignRequest, BranchRequirement
        
        print("\n3.1 Testing structured input workflow:")
        orchestrator = SubnetDesignOrchestrator(groq_api_key=groq_key)
        
        request = SubnetDesignRequest(
            base_ip="172.16.0.0",
            cidr=16,
            growth_buffer=0.3,
            branches=[
                BranchRequirement(name="Finance", hosts_needed=150, description="High security"),
                BranchRequirement(name="Engineering", hosts_needed=400),
                BranchRequirement(name="IoT", description="1000 sensor devices"),
                BranchRequirement(name="Guest WiFi", description="Public access, isolated")
            ]
        )
        
        response = orchestrator.design_from_structured(request)
        
        if response.success:
            print(f"  ✅ Design successful: {len(response.subnets)} subnets allocated")
            print(f"  📊 Summary: {response.summary}")
            print(f"  💡 Recommendations: {len(response.recommendations)}")
            
            print("\n  Allocated Subnets:")
            for subnet in response.subnets:
                print(f"    - {subnet.branch_name}:")
                print(f"        Network: {subnet.network_address}/{subnet.cidr}")
                print(f"        Usable: {subnet.usable_hosts} IPs")
                print(f"        VLAN: {subnet.vlan_id}, Zone: {subnet.security_zone}")
        else:
            print(f"  ❌ Design failed: {response.error}")
            return False
        
        return True
    
    except Exception as e:
        print(f"  ❌ E2E test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n🧪 AI-Powered Subnet Designer - Test Suite")
    print("=" * 60)
    
    results = {}
    
    # Run tests
    results['subnet_calc'] = test_subnet_calculations()
    results['ai_reasoning'] = test_ai_reasoning()
    results['end_to_end'] = test_end_to_end()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check output above.")
        return 1


if __name__ == '__main__':
    sys.exit(main())
