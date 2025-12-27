from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from datetime import datetime
import os
import json

app = Flask(__name__)
CORS(app)

# Store compliance reports in memory (in production, use a database)
compliance_reports = []

# Path to the compliance checker script
SCRIPT_PATH = os.path.join(os.path.dirname(__file__), 'compliance_checker.py')

@app.route('/get-script', methods=['GET'])
def get_script():
    """
    Endpoint to serve the compliance checking script
    This is fetched by the Arduino device via curl
    """
    try:
        return send_file(SCRIPT_PATH, mimetype='text/x-python')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/report', methods=['POST'])
def receive_report():
    """
    Endpoint to receive compliance reports from devices
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['device_name', 'timestamp', 'compliance_percentage', 'checks']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Add report to storage
        report = {
            'id': len(compliance_reports) + 1,
            'device_name': data['device_name'],
            'timestamp': data['timestamp'],
            'compliance_percentage': data['compliance_percentage'],
            'checks': data['checks'],
            'received_at': datetime.now().isoformat()
        }
        
        compliance_reports.append(report)
        
        print(f"✓ Received report from {data['device_name']} - {data['compliance_percentage']:.0f}% compliant")
        
        return jsonify({
            'success': True,
            'message': 'Report received successfully',
            'report_id': report['id']
        }), 200
        
    except Exception as e:
        print(f"✗ Error receiving report: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports', methods=['GET'])
def get_reports():
    """
    Endpoint to retrieve all compliance reports
    Used by the dashboard
    """
    try:
        # Sort by timestamp (newest first)
        sorted_reports = sorted(
            compliance_reports,
            key=lambda x: x['timestamp'],
            reverse=True
        )
        
        return jsonify({
            'success': True,
            'count': len(sorted_reports),
            'reports': sorted_reports
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/<int:report_id>', methods=['GET'])
def get_report_detail(report_id):
    """
    Endpoint to retrieve a specific report by ID
    """
    try:
        report = next((r for r in compliance_reports if r['id'] == report_id), None)
        
        if report:
            return jsonify({
                'success': True,
                'report': report
            }), 200
        else:
            return jsonify({'error': 'Report not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """
    Endpoint to get compliance statistics
    """
    try:
        if not compliance_reports:
            return jsonify({
                'success': True,
                'stats': {
                    'total_reports': 0,
                    'average_compliance': 0,
                    'compliant_devices': 0,
                    'non_compliant_devices': 0
                }
            }), 200
        
        total = len(compliance_reports)
        avg_compliance = sum(r['compliance_percentage'] for r in compliance_reports) / total
        compliant = sum(1 for r in compliance_reports if r['compliance_percentage'] == 100)
        non_compliant = total - compliant
        
        return jsonify({
            'success': True,
            'stats': {
                'total_reports': total,
                'average_compliance': round(avg_compliance, 2),
                'compliant_devices': compliant,
                'non_compliant_devices': non_compliant
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/findings', methods=['GET'])
def get_findings():
    """
    Endpoint to retrieve compliance findings (alias for reports)
    Used by integrated dashboard
    """
    try:
        # Sort by timestamp (newest first)
        sorted_reports = sorted(
            compliance_reports,
            key=lambda x: x['timestamp'],
            reverse=True
        )
        
        return jsonify({
            'success': True,
            'count': len(sorted_reports),
            'findings': sorted_reports
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({
        'status': 'healthy',
        'service': 'Sentinel AI Network - Compliance Service',
        'timestamp': datetime.now().isoformat()
    }), 200

if __name__ == '__main__':
    print("🚀 Starting Sentinel AI Network - Compliance Service")
    print("📡 Script endpoint: http://localhost:5001/get-script")
    print("📊 Dashboard API: http://localhost:5001/api/reports")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5001, debug=True)
