from flask import Flask, request, jsonify

import os
import subprocess
import tempfile
import sys
from pathlib import Path
import logging
import traceback

app = Flask(__name__)

@app.route('/')
def home():
    return "Welcome to my Flask app!"

@app.route('/favicon.ico')
def favicon():
    return '', 204  # Empty response with a 204 No Content status code

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NetlistProcessor:
    def __init__(self, upload_folder="temp_netlists"):
        self.upload_folder = upload_folder
        Path(upload_folder).mkdir(parents=True, exist_ok=True)
    
    def save_netlist(self, netlist_content, filename="temp_netlist.net"):
        """Save the netlist content to a temporary file"""
        try:
            filepath = os.path.join(self.upload_folder, filename)
            with open(filepath, 'w') as f:
                f.write(netlist_content)
            return filepath
        except Exception as e:
            logger.error(f"Error saving netlist: {str(e)}")
            raise
    
    def process_netlist(self, filepath):
        """Process the netlist using the existing server2.py script"""
        try:
            # Capture the output of the script
            result = subprocess.run(
                [sys.executable, "server2.py"],
                capture_output=True,
                text=True,
                env={**os.environ, 'NETLIST_PATH': filepath}
            )
            
            if result.returncode != 0:
                raise Exception(f"Script execution failed: {result.stderr}")
            
            return {
                'output': result.stdout,
                'equations': self._parse_equations(result.stdout),
                'matrices': self._parse_matrices(result.stdout)
            }
        except Exception as e:
            logger.error(f"Error processing netlist: {str(e)}")
            raise

    def _parse_equations(self, output):
        """Parse equations from the script output"""
        try:
            # Find the equations section in the output
            equations_start = output.find("print(equ)")
            if equations_start != -1:
                equations_section = output[equations_start:].split('\n')[1]
                return equations_section
            return None
        except Exception as e:
            logger.error(f"Error parsing equations: {str(e)}")
            return None

    def _parse_matrices(self, output):
        """Parse matrices from the script output"""
        try:
            matrices = {}
            matrix_names = ['G', 'B', 'C', 'D', 'V', 'I', 'J', 'A']
            
            for matrix_name in matrix_names:
                start_marker = f"print({matrix_name})"
                start_idx = output.find(start_marker)
                if start_idx != -1:
                    matrix_section = output[start_idx:].split('\n')[1]
                    matrices[matrix_name] = matrix_section
            
            return matrices
        except Exception as e:
            logger.error(f"Error parsing matrices: {str(e)}")
            return None

    def cleanup(self, filepath):
        """Clean up temporary files"""
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception as e:
            logger.error(f"Error cleaning up files: {str(e)}")

processor = NetlistProcessor()

@app.route('/process-netlist', methods=['POST'])
def process_netlist():
    try:
        if 'netlist' not in request.json:
            return jsonify({'error': 'No netlist content provided'}), 400

        netlist_content = request.json['netlist']
        
        # Save the netlist to a temporary file
        filepath = processor.save_netlist(netlist_content)
        
        # Process the netlist
        result = processor.process_netlist(filepath)
        
        # Clean up
        processor.cleanup(filepath)
        
        return jsonify({
            'status': 'success',
            'results': result
        })

    except Exception as e:
        logger.error(f"Error in process_netlist endpoint: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)