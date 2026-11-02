Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$build = Join-Path $root 'build'
New-Item -ItemType Directory -Force -Path $build | Out-Null

function New-DocFlowIcon([int]$size, [string]$target) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 28, 25, 23))
  $g.FillRectangle($bg, 0, 0, $size, $size)

  $pad = [int]($size * 0.18)
  $sheetW = [int]($size * 0.50)
  $sheetH = [int]($size * 0.62)
  $x = [int](($size - $sheetW) / 2)
  $y = [int](($size - $sheetH) / 2)

  $paper = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 253, 246, 227))
  $g.FillRectangle($paper, $x, $y, $sheetW, $sheetH)

  $fold = [int]($size * 0.14)
  $foldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 231, 208, 160))
  $points = @(
    (New-Object System.Drawing.Point(($x + $sheetW - $fold), $y)),
    (New-Object System.Drawing.Point(($x + $sheetW), ($y + $fold))),
    (New-Object System.Drawing.Point(($x + $sheetW - $fold), ($y + $fold)))
  )
  $g.FillPolygon($foldBrush, $points)

  $accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 217, 119, 6))
  $lineH = [Math]::Max(2, [int]($size * 0.018))
  $gap = [int]($size * 0.055)
  $lineX = $x + [int]($size * 0.08)
  $lineW = [int]($sheetW * 0.58)
  for ($i = 0; $i -lt 3; $i++) {
    $g.FillRectangle($accent, $lineX, ($y + [int]($sheetH * 0.42) + ($i * $gap)), $lineW, $lineH)
  }
  $shortW = [int]($lineW * 0.62)
  $g.FillRectangle($accent, $lineX, ($y + [int]($sheetH * 0.42) + (3 * $gap)), $shortW, $lineH)

  $g.Dispose()
  $bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$png512 = Join-Path $build 'icon.png'
$png256 = Join-Path $build 'icon-256.png'
New-DocFlowIcon 512 $png512
New-DocFlowIcon 256 $png256

# Build a Vista+ PNG-compressed .ico from the 256 px image.
$pngBytes = [System.IO.File]::ReadAllBytes($png256)
$icoPath = Join-Path $build 'icon.ico'
$stream = [System.IO.File]::Create($icoPath)
$writer = New-Object System.IO.BinaryWriter($stream)
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([Byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$pngBytes.Length)
$writer.Write([UInt32]22)
$writer.Write($pngBytes)
$writer.Flush()
$writer.Close()
$stream.Close()

Remove-Item $png256 -Force
Write-Host "Generated build/icon.png and build/icon.ico"
