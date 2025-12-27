"""
Intelligent Network Configuration Parser
Uses Qdrant vector database + Sentence Transformers + NLTK
"""

import nltk
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import numpy as np
import re
import uuid
from typing import Dict, Optional, List

# Download required NLTK data (run once)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    nltk.download('averaged_perceptron_tagger')
    nltk.download('wordnet')
    nltk.download('stopwords')


class IntelligentNetworkParser:
    def __init__(self, qdrant_url=None, qdrant_api_key=None):
        """Initialize parser with Qdrant vector database"""
        
        # Initialize sentence transformer
        print("Loading sentence transformer model...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.embedding_dim = 384  # all-MiniLM-L6-v2 dimension
        
        # Connect to Qdrant (Cloud or local)
        if qdrant_url and qdrant_api_key:
            print(f"Connecting to Qdrant Cloud at {qdrant_url}...")
            self.qdrant = QdrantClient(
                url=qdrant_url,
                api_key=qdrant_api_key,
            )
        else:
            print(f"Connecting to local Qdrant at localhost:6333...")
            self.qdrant = QdrantClient(host="localhost", port=6333)
        
        self.collection_name = "network_services"
        
        # Service knowledge base
        self.services = {
            'web_server': {
                'examples': [
                    'web server', 'http server', 'website', 'apache', 'nginx',
                    'web application', 'web service', 'web hosting', 'web app',
                    'serve website', 'host website', 'web traffic'
                ],
                'ports': {'virtual': 80, 'internal': 8080},
                'protocol': 'HTTP',
                'description': 'web server'
            },
            'api_service': {
                'examples': [
                    'api server', 'rest api', 'api endpoint', 'backend api',
                    'graphql api', 'api gateway', 'microservice', 'api service',
                    'restful api', 'json api', 'api backend'
                ],
                'ports': {'virtual': 443, 'internal': 3000},
                'protocol': 'HTTPS',
                'description': 'api service'
            },
            'database': {
                'examples': [
                    'database', 'mysql', 'postgres', 'postgresql', 'mongodb', 
                    'sql server', 'db server', 'database server', 'data store',
                    'redis', 'mariadb', 'mysql server', 'postgres server'
                ],
                'ports': {'virtual': 3306, 'internal': 3306},
                'protocol': 'TCP',
                'description': 'database server'
            },
            'video_streaming': {
                'examples': [
                    'video streaming', 'stream video', 'media server', 'rtmp server',
                    'streaming service', 'live streaming', 'video broadcast',
                    'streaming movies', 'stream content', 'media streaming'
                ],
                'ports': {'virtual': 8080, 'internal': 1935},
                'protocol': 'TCP',
                'description': 'video streaming service'
            },
            'file_transfer': {
                'examples': [
                    'file transfer', 'ftp server', 'sftp', 'file sharing',
                    'file server', 'file upload', 'download service', 'ftp',
                    'file sharing server', 'file transfer protocol'
                ],
                'ports': {'virtual': 21, 'internal': 21},
                'protocol': 'TCP',
                'description': 'file transfer service'
            },
            'vpn': {
                'examples': [
                    'vpn server', 'virtual private network', 'openvpn', 'wireguard',
                    'vpn service', 'secure tunnel', 'remote access', 'vpn access',
                    'private network', 'vpn connection'
                ],
                'ports': {'virtual': 1194, 'internal': 1194},
                'protocol': 'UDP',
                'description': 'vpn server'
            },
            'ssh': {
                'examples': [
                    'ssh server', 'secure shell', 'remote terminal', 'ssh access',
                    'terminal server', 'remote shell', 'ssh connection',
                    'secure terminal', 'remote access terminal'
                ],
                'ports': {'virtual': 22, 'internal': 22},
                'protocol': 'TCP',
                'description': 'ssh server'
            },
            'game_server': {
                'examples': [
                    'game server', 'minecraft server', 'gaming server', 'game hosting',
                    'multiplayer server', 'steam server', 'cs server', 'minecraft',
                    'gaming service', 'game host'
                ],
                'ports': {'virtual': 25565, 'internal': 25565},
                'protocol': 'TCP',
                'description': 'game server'
            },
            'mail_server': {
                'examples': [
                    'mail server', 'email server', 'smtp server', 'mail service',
                    'email service', 'mail hosting', 'email hosting', 'postfix',
                    'smtp service', 'mail transfer'
                ],
                'ports': {'virtual': 25, 'internal': 25},
                'protocol': 'TCP',
                'description': 'mail server'
            }
        }
        
        # Initialize Qdrant collection
        self.initialize_qdrant_collection()
    
    def initialize_qdrant_collection(self):
        """Create and populate Qdrant collection with service embeddings"""
        
        # Check if collection exists
        collections = self.qdrant.get_collections().collections
        collection_exists = any(c.name == self.collection_name for c in collections)
        
        if collection_exists:
            print(f"Collection '{self.collection_name}' already exists. Deleting and recreating...")
            self.qdrant.delete_collection(self.collection_name)
        
        # Create collection
        print(f"Creating Qdrant collection: {self.collection_name}")
        self.qdrant.create_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(
                size=self.embedding_dim,
                distance=Distance.COSINE
            )
        )
        
        # Populate with service examples
        points = []
        for service_name, service_data in self.services.items():
            for example in service_data['examples']:
                # Generate embedding
                embedding = self.model.encode(example).tolist()
                
                # Create point
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        'service_name': service_name,
                        'example_text': example,
                        'ports': service_data['ports'],
                        'protocol': service_data['protocol'],
                        'description': service_data['description']
                    }
                )
                points.append(point)
        
        # Upload to Qdrant
        print(f"Uploading {len(points)} vectors to Qdrant...")
        self.qdrant.upsert(
            collection_name=self.collection_name,
            points=points
        )
        print("Qdrant initialization complete!")
    
    def parse(self, user_input: str) -> Dict:
        """Main parsing function - converts natural language to network config"""
        
        # Step 1: NLTK preprocessing
        tokens = self.tokenize_and_tag(user_input)
        
        # Step 2: Extract ports using regex + NLP
        ports = self.extract_ports(user_input, tokens)
        
        # Step 3: Detect service using Qdrant vector similarity
        service_match = self.detect_service_with_qdrant(user_input)
        
        # Step 4: Extract/detect protocol
        protocol = self.detect_protocol(user_input, service_match)
        
        # Step 5: Generate proxy name
        proxy_name = self.generate_proxy_name(user_input, service_match)
        
        # Step 6: Extract service description
        service_desc = self.extract_description(user_input, tokens, service_match)
        
        return {
            'virtualPort': ports['virtual'] or (service_match['ports']['virtual'] if service_match else None),
            'internalPort': ports['internal'] or (service_match['ports']['internal'] if service_match else None),
            'proxyName': proxy_name,
            'protocol': protocol,
            'serviceDescription': service_desc,
            'confidence': service_match['confidence'] if service_match else 0.3,
            'detectedService': service_match['service_name'] if service_match else None
        }
    
    def tokenize_and_tag(self, text: str) -> List:
        """NLTK tokenization and POS tagging"""
        tokens = nltk.word_tokenize(text.lower())
        pos_tags = nltk.pos_tag(tokens)
        return pos_tags
    
    def extract_ports(self, text: str, tokens: List) -> Dict[str, Optional[int]]:
        """Extract port numbers using multiple strategies"""
        ports = {'virtual': None, 'internal': None}
        
        # Strategy 1: Explicit patterns with keywords
        patterns = [
            r'(?:external|public|virtual|from|expose)\s*port\s*(\d+)\s*(?:to|->|=>|forward to)\s*(?:internal|local|port)?\s*(\d+)',
            r'port\s*(\d+)\s*(?:to|->|=>)\s*(?:port\s*)?(\d+)',
            r'(\d+)\s*(?:to|->|=>)\s*(\d+)',
            r'(?:external|virtual)\s*(\d+)\s*internal\s*(\d+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                ports['virtual'] = int(match.group(1))
                ports['internal'] = int(match.group(2))
                return ports
        
        # Strategy 2: Single port with direction keywords
        single_port_patterns = [
            r'(?:on|port)\s*(\d+)',
            r'port\s*(\d+)',
        ]
        
        # Strategy 3: Extract all numbers from tagged tokens
        numbers = []
        for word, tag in tokens:
            if tag == 'CD' or word.isdigit():  # Cardinal number
                try:
                    num = int(word)
                    if 1 <= num <= 65535:  # Valid port range
                        numbers.append(num)
                except:
                    pass
        
        # Also extract from regex
        number_matches = re.findall(r'\b(\d+)\b', text)
        for match in number_matches:
            num = int(match)
            if 1 <= num <= 65535 and num not in numbers:
                numbers.append(num)
        
        if len(numbers) >= 2:
            ports['virtual'] = numbers[0]
            ports['internal'] = numbers[1]
        elif len(numbers) == 1:
            ports['virtual'] = numbers[0]
            ports['internal'] = numbers[0]  # Same port for both
        
        return ports
    
    def detect_service_with_qdrant(self, text: str) -> Optional[Dict]:
        """Use Qdrant vector similarity search to detect service"""
        
        # Encode user input
        query_embedding = self.model.encode(text).tolist()
        
        # Search in Qdrant (updated API)
        search_results = self.qdrant.query_points(
            collection_name=self.collection_name,
            query=query_embedding,
            limit=3  # Get top 3 matches
        )
        
        if not search_results or not search_results.points:
            return None
        
        # Best match
        best_match = search_results.points[0]
        
        # Threshold: only return if confidence > 0.35
        if best_match.score < 0.35:
            return None
        
        return {
            'service_name': best_match.payload['service_name'],
            'confidence': float(best_match.score),
            'ports': best_match.payload['ports'],
            'protocol': best_match.payload['protocol'],
            'description': best_match.payload['description'],
            'matched_example': best_match.payload['example_text']
        }
    
    def detect_protocol(self, text: str, service_match: Optional[Dict]) -> str:
        """Detect protocol from text or service match"""
        text_lower = text.lower()
        
        # Explicit mention
        protocol_keywords = {
            'HTTP': ['http', 'web', 'browser'],
            'HTTPS': ['https', 'secure http', 'ssl', 'tls'],
            'TCP': ['tcp', 'transmission control'],
            'UDP': ['udp', 'user datagram']
        }
        
        for protocol, keywords in protocol_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return protocol
        
        # From service match
        if service_match:
            return service_match['protocol']
        
        return 'TCP'  # Default
    
    def generate_proxy_name(self, text: str, service_match: Optional[Dict]) -> str:
        """Generate meaningful proxy name"""
        
        # Try to extract explicit name
        name_patterns = [
            r'(?:name|called|named)\s+([a-z0-9_-]+)',
            r'([a-z0-9_-]+)\s+(?:proxy|route|service)',
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text.lower())
            if match:
                return match.group(1)
        
        # Generate from service
        if service_match:
            base_name = service_match['service_name'].replace('_', '')
            return f"{base_name}{np.random.randint(0, 100)}"
        
        return f"route{np.random.randint(0, 1000)}"
    
    def extract_description(self, text: str, tokens: List, service_match: Optional[Dict]) -> str:
        """Extract or generate service description"""
        
        # Try to find noun phrases using POS tags
        noun_phrases = []
        current_phrase = []
        
        for word, tag in tokens:
            if tag.startswith('NN') or tag.startswith('JJ') or tag in ['VBG']:
                current_phrase.append(word)
            elif current_phrase:
                phrase = ' '.join(current_phrase)
                if len(phrase) > 3:  # Meaningful phrases
                    noun_phrases.append(phrase)
                current_phrase = []
        
        if current_phrase:
            phrase = ' '.join(current_phrase)
            if len(phrase) > 3:
                noun_phrases.append(phrase)
        
        # Return longest meaningful phrase
        if noun_phrases:
            best_phrase = max(noun_phrases, key=len)
            return best_phrase if len(best_phrase) < 50 else best_phrase[:47] + '...'
        
        # Fallback to service match
        if service_match:
            return service_match['description']
        
        return 'network service'


# Example usage and testing
if __name__ == '__main__':
    import os
    from dotenv import load_dotenv
    
    # Load environment variables
    load_dotenv()
    
    # Initialize with cloud credentials if available
    qdrant_url = os.getenv('QDRANT_URL')
    qdrant_api_key = os.getenv('QDRANT_API_KEY')
    
    parser = IntelligentNetworkParser(
        qdrant_url=qdrant_url,
        qdrant_api_key=qdrant_api_key
    )
    
    test_cases = [
        "Setup a web server on port 8080",
        "I want to host my website from port 9000 to 3000",
        "Create api service 443 to 8000",
        "streaming movies port 8080 to 1935",
        "mysql databse on port 3306",  # typo intentional
        "vpn access on 1194",
        "forward port 80 to 9000 for my web application",
        "game server minecraft port 25565",
        "ssh terminal 22",
        "expose port 8080 for video streaming service"
    ]
    
    print("\n" + "="*70)
    print("TESTING NLP PARSER WITH QDRANT")
    print("="*70 + "\n")
    
    for test in test_cases:
        print(f"📝 Input: {test}")
        result = parser.parse(test)
        print(f"✅ Result:")
        print(f"   Virtual Port: {result['virtualPort']}")
        print(f"   Internal Port: {result['internalPort']}")
        print(f"   Proxy Name: {result['proxyName']}")
        print(f"   Protocol: {result['protocol']}")
        print(f"   Description: {result['serviceDescription']}")
        print(f"   Confidence: {result['confidence']:.2f}")
        print(f"   Detected Service: {result['detectedService']}")
        print("-" * 70 + "\n")
