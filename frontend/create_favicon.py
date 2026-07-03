from pathlib import Path
import base64
p = Path('assets/favicon.png')
p.write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAIAAeIhvAAAAAElFTkSuQmCC'))
print(p.exists(), p.stat().st_size)
