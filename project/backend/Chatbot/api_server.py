"""
Flask API Server for Network Configuration Parser
Exposes REST endpoints for the NLP parser
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from nlp_parser import IntelligentNetworkParser
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Initialize parser (singleton)
parser = None

def get_parser():
    """Lazy initialization of parser"""
    global parser
    if parser is None:
        logger.info("Initializing NLP parser...")
        
        # Get Qdrant credentials from environment
        qdrant_url = os.getenv('QDRANT_URL')
        qdrant_api_key = os.getenv('QDRANT_API_KEY')
        
        if qdrant_url and qdrant_api_key:
            logger.info(f"Using Qdrant Cloud at {qdrant_url}")
            parser = IntelligentNetworkParser(
                qdrant_url=qdrant_url,
                qdrant_api_key=qdrant_api_key
            )
        else:
            logger.info("Using local Qdrant at localhost:6333")
            parser = IntelligentNetworkParser()
        
        logger.info("Parser initialized successfully!")
    return parser


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Network Config Parser API',
        'version': '1.0.0'
    })


@app.route('/api/parse', methods=['POST'])
def parse_natural_language():
    """
    Parse natural language input to extract network configuration
    
    Request body:
    {
        "input": "Setup web server on port 8080"
    }
    
    Response:
    {
        "success": true,
        "config": {
            "virtualPort": 8080,
            "internalPort": 8080,
            "proxyName": "webserver42",
            "protocol": "HTTP",
            "serviceDescription": "web server",
            "confidence": 0.85,
            "detectedService": "web_server"
        }
    }
    """
    try:
        # Get input from request
        data = request.get_json()
        
        if not data or 'input' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "input" field in request body'
            }), 400
        
        user_input = data['input'].strip()
        
        if not user_input:
            return jsonify({
                'success': False,
                'error': 'Input cannot be empty'
            }), 400
        
        # Parse using NLP engine
        logger.info(f"Parsing input: {user_input}")
        config = get_parser().parse(user_input)
        
        return jsonify({
            'success': True,
            'config': config,
            'input': user_input
        })
    
    except Exception as e:
        logger.error(f"Error parsing input: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/services', methods=['GET'])
def get_supported_services():
    """Get list of supported services"""
    try:
        parser_instance = get_parser()
        services = []
        
        for service_name, service_data in parser_instance.services.items():
            services.append({
                'name': service_name,
                'description': service_data['description'],
                'defaultPorts': service_data['ports'],
                'protocol': service_data['protocol'],
                'examples': service_data['examples'][:3]  # First 3 examples
            })
        
        return jsonify({
            'success': True,
            'services': services,
            'count': len(services)
        })
    
    except Exception as e:
        logger.error(f"Error fetching services: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/search', methods=['POST'])
def search_services():
    """
    Search for similar services using Qdrant vector search
    
    Request body:
    {
        "query": "video streaming",
        "limit": 5
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "query" field in request body'
            }), 400
        
        query = data['query'].strip()
        limit = data.get('limit', 5)
        
        parser_instance = get_parser()
        
        # Encode query
        query_embedding = parser_instance.model.encode(query).tolist()
        
        # Search in Qdrant (updated API)
        search_results = parser_instance.qdrant.query_points(
            collection_name=parser_instance.collection_name,
            query=query_embedding,
            limit=limit
        )
        
        results = []
        if search_results and search_results.points:
            for result in search_results.points:
                results.append({
                    'service': result.payload['service_name'],
                    'description': result.payload['description'],
                    'matchedExample': result.payload['example_text'],
                    'similarity': float(result.score),
                    'ports': result.payload['ports'],
                    'protocol': result.payload['protocol']
                })
        
        return jsonify({
            'success': True,
            'query': query,
            'results': results,
            'count': len(results)
        })
    
    except Exception as e:
        logger.error(f"Error searching services: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/batch-parse', methods=['POST'])
def batch_parse():
    """
    Parse multiple inputs at once
    
    Request body:
    {
        "inputs": [
            "web server on 8080",
            "api service 443 to 3000",
            "mysql database 3306"
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'inputs' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "inputs" field in request body'
            }), 400
        
        inputs = data['inputs']
        
        if not isinstance(inputs, list):
            return jsonify({
                'success': False,
                'error': '"inputs" must be an array'
            }), 400
        
        parser_instance = get_parser()
        results = []
        
        for user_input in inputs:
            try:
                config = parser_instance.parse(user_input.strip())
                results.append({
                    'input': user_input,
                    'success': True,
                    'config': config
                })
            except Exception as e:
                results.append({
                    'input': user_input,
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'results': results,
            'count': len(results)
        })
    
    except Exception as e:
        logger.error(f"Error in batch parse: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


if __name__ == '__main__':
    print("\n" + "="*70)
    print("🚀 Starting Network Config Parser API Server")
    print("="*70)
    print("\nAvailable endpoints:")
    print("  GET  /health              - Health check")
    print("  POST /api/parse           - Parse natural language input")
    print("  POST /api/search          - Search for similar services")
    print("  GET  /api/services        - Get supported services")
    print("  POST /api/batch-parse     - Parse multiple inputs")
    print("\n" + "="*70 + "\n")
    
    port = int(os.getenv('FLASK_PORT', 5000))
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True
    )
