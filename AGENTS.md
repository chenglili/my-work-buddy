# Repository Notes

## GitHub Push Troubleshooting

If `git push origin main` fails with `Failed to connect to github.com port 443`, this is a Git network route problem, not a frontend or backend build failure. Browser access to GitHub does not guarantee that Git is using the same proxy.

1. Check connectivity:

```powershell
Test-NetConnection github.com -Port 443
```

2. Check the Windows user proxy. The browser may use a local proxy even when WinHTTP and Git do not:

```powershell
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' | Select-Object ProxyEnable, ProxyServer, AutoConfigURL
```

3. When `ProxyEnable` is `1` and `ProxyServer` is a local address such as `127.0.0.1:7897`, configure the proxy for this repository before pushing:

```powershell
git config http.proxy http://127.0.0.1:7897
git push origin main
```

4. Verify the push instead of relying only on the command output:

```powershell
git status --short --branch
git log -1 --oneline
git log origin/main -1 --oneline
```

The local branch must show `main...origin/main` without `[ahead N]`. Do not repeatedly retry a direct push while the TCP connection is failing; check the proxy first. Do not stage or commit unrelated generated files such as `output/`, `tmp/`, `supabase/.branches/`, or untracked image assets.
