import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from orchestrator import run_pipeline

if __name__ == "__main__":
    import json
    def callback(t, d):
        print(f"EVENT: {t} -> {d}")
        
    res = run_pipeline("Analyze the market opportunity for a new AI tutoring platform in India", callback)
    
    with open('/tmp/test_output.json', 'w') as f:
        json.dump(res, f, indent=2)
    print("Test finished successfully!")
