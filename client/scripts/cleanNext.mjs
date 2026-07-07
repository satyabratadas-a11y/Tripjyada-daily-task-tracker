import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const nextDir = resolve('.next');
const clientRoot = resolve('.');

function resolvePowerShellExecutable() {
  const candidates = [
    process.env.ComSpec && process.env.ComSpec.replace(/cmd\.exe$/i, 'WindowsPowerShell\\v1.0\\powershell.exe'),
    'powershell.exe',
    'pwsh.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes('\\')) {
      if (existsSync(candidate)) return candidate;
      continue;
    }

    try {
      execFileSync(candidate, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'], {
        stdio: 'ignore',
      });
      return candidate;
    } catch {
      // try the next candidate
    }
  }

  return null;
}

function stopStaleNextDevProcesses() {
  if (process.platform !== 'win32') return;

  const powershellExecutable = resolvePowerShellExecutable();
  if (!powershellExecutable) {
    console.warn('[dev] could not find PowerShell, skipping stale Next process cleanup');
    return;
  }

  const escapedClientRoot = clientRoot.replace(/'/g, "''");
  const script = `
    $clientRoot = '${escapedClientRoot}'
    $targets = Get-CimInstance Win32_Process | Where-Object {
      $_.Name -eq 'node.exe' -and
      $_.ProcessId -ne ${process.pid} -and
      $_.CommandLine -and
      $_.CommandLine.Contains($clientRoot) -and
      (
        $_.CommandLine -like '*\\node_modules\\.bin\\..\\next\\dist\\bin\\next" dev*' -or
        $_.CommandLine -like '*\\node_modules\\next\\dist\\server\\lib\\start-server.js*'
      )
    }

    foreach ($target in $targets) {
      try {
        Stop-Process -Id $target.ProcessId -Force -ErrorAction Stop
        Write-Output "[dev] stopped stale Next process $($target.ProcessId)"
      } catch {
        Write-Warning "[dev] could not stop process $($target.ProcessId): $($_.Exception.Message)"
      }
    }
  `;

  try {
    execFileSync(powershellExecutable, ['-NoProfile', '-Command', script], { stdio: 'inherit' });
  } catch (error) {
    console.warn('[dev] could not stop stale Next processes:', error);
  }
}

stopStaleNextDevProcesses();

try {
  rmSync(nextDir, { recursive: true, force: true });
  console.log('[dev] cleared .next');
} catch (error) {
  console.warn('[dev] could not clear .next:', error);
}
