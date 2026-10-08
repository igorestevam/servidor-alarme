# =====================================================================
# Simula a ESP32 enviando eventos para a API (teste sem hardware).
#
# Uso (PowerShell):
#   .\testes\testar-api.ps1 -Url "https://SEU-PROJETO.supabase.co/functions/v1/registrar-evento" -Chave "SUA_DEVICE_KEY"
# =====================================================================

param(
    [Parameter(Mandatory = $true)] [string] $Url,
    [Parameter(Mandatory = $true)] [string] $Chave,
    [string] $Sensor = "quarto-1"
)

function Enviar($chaveUsada, $corpo) {
    try {
        $resp = Invoke-WebRequest -Uri $Url -Method POST -UseBasicParsing `
            -ContentType "application/json" `
            -Headers @{ "X-Device-Key" = $chaveUsada } `
            -Body $corpo
        return "$($resp.StatusCode) $($resp.Content)"
    } catch {
        $status = [int]$_.Exception.Response.StatusCode
        return "$status (erro)"
    }
}

$corpoValido = "{`"sensor`":`"$Sensor`",`"evento`":`"movimento`"}"

Write-Host "1) Evento valido (esperado 201):"
Write-Host "   " (Enviar $Chave $corpoValido)

Write-Host "2) Chave errada (esperado 401, nada gravado):"
Write-Host "   " (Enviar "chave-errada" $corpoValido)

Write-Host "3) Sensor inexistente (esperado 404):"
Write-Host "   " (Enviar $Chave '{"sensor":"nao-existe","evento":"movimento"}')

Write-Host "4) JSON invalido (esperado 400):"
Write-Host "   " (Enviar $Chave 'isso nao e json')
