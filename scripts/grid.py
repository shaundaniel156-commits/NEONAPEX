import subprocess, glob, sys
pattern, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(pattern))
n = len(files); cols = 2
inputs = []
for f in files: inputs += ['-i', f]
fc = ''.join(f'[{i}]scale=640:-1[s{i}];' for i in range(n))
rows = []
for r in range(0, n, cols):
    k = min(cols, n - r)
    if k == 1: fc += f'[s{r}]pad=1280:ih:0:0[r{r}];'
    else: fc += ''.join(f'[s{i}]' for i in range(r, r + k)) + f'hstack=inputs={k}[r{r}];'
    rows.append(f'[r{r}]')
fc += ''.join(rows) + f'vstack=inputs={len(rows)}'
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', fc, out])
print(n, 'frames ->', out)
