# Mantém o servidor JetaFlow (next start) rodando, reiniciando automaticamente se cair.
Set-Location -Path "D:\JETAPRINT\JetaFlow"
while ($true) {
  npm start
  Start-Sleep -Seconds 5
}
