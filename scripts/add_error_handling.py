import sys

def indent(text, spaces=4):
    return '\n'.join((' ' * spaces) + line if line.strip() else line for line in text.split('\n'))

def wrap_in_try_except(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start of honeypot_conversation body
    # "    if x_api_key != API_KEY_SECRET:\n        raise HTTPException(status_code=401, detail=\"Invalid API key\")\n    \n    session_id = request.sessionId\n"
    
    target_start = "    session_id = request.sessionId\n"
    target_end = "    return result_payload\n"
    
    idx_start = content.find(target_start)
    if idx_start == -1:
        print("Could not find start for honeypot_conversation")
        sys.exit(1)
        
    idx_end = content.find(target_end, idx_start) + len(target_end)
    
    body = content[idx_start:idx_end]
    indented_body = indent(body, 4)
    
    try_except_block = f"""    try:
{indented_body}    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[ERROR] Unhandled exception in honeypot_conversation: {{str(e)}}")
        raise HTTPException(status_code=500, detail="Internal Server Error processing the request")
"""
    
    content = content[:idx_start] + try_except_block + content[idx_end:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Successfully wrapped honeypot_conversation!")

if __name__ == '__main__':
    wrap_in_try_except(r'c:\Users\Aatmman C Patil\Downloads\honeypot-system (1)\honeypot-system\main.py')
