import base64

with open('audio_data.js', 'w') as out:
    out.write('window.AUDIO_DATA = {\n')
    for name in ['single key press.mp3', 'hum.mp3', 'button press.mp3']:
        with open(name, 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('utf-8')
            out.write(f'  "{name}": "{b64}",\n')
    out.write('};\n')
