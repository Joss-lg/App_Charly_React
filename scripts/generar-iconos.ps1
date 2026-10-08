# Genera ícono, ícono Android, favicon y logo del splash a partir de los logos de pizzetos.com.mx
Add-Type -AssemblyName System.Drawing

$raiz   = Split-Path $PSScriptRoot -Parent
$assets = Join-Path $raiz 'assets'
$fondo  = [System.Drawing.ColorTranslator]::FromHtml('#FFFFFF')

$logoCuadrado  = Join-Path $assets 'logo-pizzetos-2.png'   # 3.png de la página
$logoHorizontal = Join-Path $assets 'logo-pizzetos.png'    # LogoPizzetos.png de la página

function Nueva-Grafica($bmp) {
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return $g
}

function Guardar-Cuadrado($origen, $destino, $lado, $escala, $conFondo) {
  $src = New-Object System.Drawing.Bitmap $origen
  $bmp = New-Object System.Drawing.Bitmap $lado, $lado
  $g = Nueva-Grafica $bmp
  if ($conFondo) { $g.Clear($fondo) } else { $g.Clear([System.Drawing.Color]::Transparent) }
  $ancho = [int]($lado * $escala)
  $alto  = [int]($ancho * $src.Height / $src.Width)
  $x = [int](($lado - $ancho) / 2)
  $y = [int](($lado - $alto) / 2)
  $g.DrawImage($src, $x, $y, $ancho, $alto)
  $bmp.Save($destino, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $src.Dispose()
  Write-Host "OK  $destino"
}

function Redimensionar($origen, $destino, $anchoFinal) {
  $src = New-Object System.Drawing.Bitmap $origen
  $alto = [int]($anchoFinal * $src.Height / $src.Width)
  $bmp = New-Object System.Drawing.Bitmap $anchoFinal, $alto
  $g = Nueva-Grafica $bmp
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($src, 0, 0, $anchoFinal, $alto)
  $bmp.Save($destino, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $src.Dispose()
  Write-Host "OK  $destino"
}

# ¿El logo cuadrado tiene fondo transparente? (se revisa la esquina)
$prueba = New-Object System.Drawing.Bitmap $logoCuadrado
$esquina = $prueba.GetPixel(10, 10)
$prueba.Dispose()
$transparente = $esquina.A -lt 255
Write-Host "Esquina del logo: A=$($esquina.A) R=$($esquina.R) G=$($esquina.G) B=$($esquina.B)  (transparente: $transparente)"

# Si es transparente se le deja margen; si ya trae fondo, ocupa todo
$escalaIcono = if ($transparente) { 0.8 } else { 1.0 }

# iOS / general: 1024x1024 SIN transparencia (Apple la rechaza)
Guardar-Cuadrado $logoCuadrado (Join-Path $assets 'icon.png') 1024 $escalaIcono $true

# Android adaptativo: logo al 62% (zona segura), fondo transparente; el color va en app.json
Guardar-Cuadrado $logoCuadrado (Join-Path $assets 'android-icon-foreground.png') 1024 0.62 $false

# Favicon web
Guardar-Cuadrado $logoCuadrado (Join-Path $assets 'favicon.png') 48 $escalaIcono $true

# Splash: logo horizontal a 1200 px de ancho, conserva transparencia
Redimensionar $logoHorizontal (Join-Path $assets 'splash-logo.png') 1200

Write-Host "Listo."