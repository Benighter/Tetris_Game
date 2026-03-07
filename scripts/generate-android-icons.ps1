$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
    param(
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius
    )

    $diameter = $Radius * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-CirclePath {
    param(
        [float]$X,
        [float]$Y,
        [float]$Size
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse($X, $Y, $Size, $Size)
    $path.CloseFigure()
    return $path
}

function Draw-Grid {
    param(
        [System.Drawing.Graphics]$Graphics,
        [System.Drawing.RectangleF]$Bounds,
        [float]$Spacing,
        [System.Drawing.Color]$Color
    )

    $pen = New-Object System.Drawing.Pen -ArgumentList $Color, ([Math]::Max(1, $Spacing / 22))
    for ($x = $Bounds.Left; $x -le $Bounds.Right; $x += $Spacing) {
        $Graphics.DrawLine($pen, $x, $Bounds.Top, $x, $Bounds.Bottom)
    }
    for ($y = $Bounds.Top; $y -le $Bounds.Bottom; $y += $Spacing) {
        $Graphics.DrawLine($pen, $Bounds.Left, $y, $Bounds.Right, $y)
    }
    $pen.Dispose()
}

function Draw-GlowBlock {
    param(
        [System.Drawing.Graphics]$Graphics,
        [float]$X,
        [float]$Y,
        [float]$Size,
        [System.Drawing.Color]$FillColor,
        [System.Drawing.Color]$BorderColor,
        [System.Drawing.Color]$GlowColor
    )

    $glowLayers = @(0.36, 0.2, 0.12)
    foreach ($index in 0..($glowLayers.Count - 1)) {
        $alpha = [int](255 * $glowLayers[$index])
        $expand = ($index + 1) * ($Size * 0.11)
        $glowPath = New-RoundedRectanglePath ($X - $expand) ($Y - $expand) ($Size + ($expand * 2)) ($Size + ($expand * 2)) ($Size * 0.18)
        $glowBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb($alpha, $GlowColor))
        $Graphics.FillPath($glowBrush, $glowPath)
        $glowBrush.Dispose()
        $glowPath.Dispose()
    }

    $blockPath = New-RoundedRectanglePath $X $Y $Size $Size ($Size * 0.15)
    $startPoint = New-Object System.Drawing.PointF -ArgumentList $X, $Y
    $endPoint = New-Object System.Drawing.PointF -ArgumentList ($X + $Size), ($Y + $Size)
    $blockBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList $startPoint, $endPoint, $FillColor, ([System.Drawing.Color]::FromArgb(255, 37, 94, 255))
    $borderPen = New-Object System.Drawing.Pen -ArgumentList $BorderColor, ([Math]::Max(1.5, $Size * 0.06))
    $highlightPen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(170, 230, 245, 255)), ([Math]::Max(1, $Size * 0.04))

    $Graphics.FillPath($blockBrush, $blockPath)
    $Graphics.DrawPath($borderPen, $blockPath)
    $Graphics.DrawLine($highlightPen, $X + ($Size * 0.18), $Y + ($Size * 0.2), $X + ($Size * 0.82), $Y + ($Size * 0.2))
    $Graphics.DrawLine($highlightPen, $X + ($Size * 0.18), $Y + ($Size * 0.2), $X + ($Size * 0.18), $Y + ($Size * 0.82))

    $highlightPen.Dispose()
    $borderPen.Dispose()
    $blockBrush.Dispose()
    $blockPath.Dispose()
}

function Draw-TetrominoMark {
    param(
        [System.Drawing.Graphics]$Graphics,
        [float]$CanvasSize,
        [bool]$ForegroundOnly = $false
    )

    $blockSize = $CanvasSize * ($(if ($ForegroundOnly) { 0.18 } else { 0.16 }))
    $originX = ($CanvasSize - ($blockSize * 3)) / 2
    $originY = $CanvasSize * ($(if ($ForegroundOnly) { 0.29 } else { 0.31 }))
    $fill = [System.Drawing.Color]::FromArgb(255, 120, 189, 255)
    $border = [System.Drawing.Color]::FromArgb(255, 220, 242, 255)
    $glow = [System.Drawing.Color]::FromArgb(255, 84, 194, 255)
    $cells = @(
        @{ X = 1; Y = 0 },
        @{ X = 0; Y = 1 },
        @{ X = 1; Y = 1 },
        @{ X = 2; Y = 1 }
    )

    foreach ($cell in $cells) {
        Draw-GlowBlock -Graphics $Graphics -X ($originX + ($cell.X * $blockSize)) -Y ($originY + ($cell.Y * $blockSize)) -Size $blockSize -FillColor $fill -BorderColor $border -GlowColor $glow
    }
}

function New-LauncherBitmap {
    param(
        [int]$Size,
        [ValidateSet('square', 'round', 'foreground')]
        [string]$Variant
    )

    $bitmap = New-Object System.Drawing.Bitmap -ArgumentList $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    if ($Variant -ne 'foreground') {
        if ($Variant -eq 'round') {
            $shape = New-CirclePath ($Size * 0.08) ($Size * 0.08) ($Size * 0.84)
        } else {
            $shape = New-RoundedRectanglePath ($Size * 0.08) ($Size * 0.08) ($Size * 0.84) ($Size * 0.84) ($Size * 0.2)
        }

        $backgroundStart = New-Object System.Drawing.PointF -ArgumentList 0, 0
        $backgroundEnd = New-Object System.Drawing.PointF -ArgumentList $Size, $Size
        $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList $backgroundStart, $backgroundEnd, ([System.Drawing.Color]::FromArgb(255, 10, 31, 78)), ([System.Drawing.Color]::FromArgb(255, 4, 14, 42))
        $shapeBounds = $shape.GetBounds()
        $gridBounds = New-Object System.Drawing.RectangleF -ArgumentList ($shapeBounds.Left + ($shapeBounds.Width * 0.16)), ($shapeBounds.Top + ($shapeBounds.Height * 0.16)), ($shapeBounds.Width * 0.68), ($shapeBounds.Height * 0.68)
        $borderPen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(255, 92, 211, 255)), ([Math]::Max(2, $Size * 0.028))
        $glowPen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(90, 92, 211, 255)), ([Math]::Max(4, $Size * 0.07))

        $graphics.FillPath($backgroundBrush, $shape)
        Draw-Grid -Graphics $graphics -Bounds $gridBounds -Spacing ($Size * 0.09) -Color ([System.Drawing.Color]::FromArgb(48, 97, 173, 255))
        $graphics.DrawPath($glowPen, $shape)
        $graphics.DrawPath($borderPen, $shape)

        $glowPen.Dispose()
        $borderPen.Dispose()
        $backgroundBrush.Dispose()
        $shape.Dispose()
    }

    Draw-TetrominoMark -Graphics $graphics -CanvasSize $Size -ForegroundOnly ($Variant -eq 'foreground')

    $graphics.Dispose()
    return $bitmap
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$resRoot = Join-Path $projectRoot 'android\app\src\main\res'
$sizes = @{
    'mipmap-mdpi' = 48
    'mipmap-hdpi' = 72
    'mipmap-xhdpi' = 96
    'mipmap-xxhdpi' = 144
    'mipmap-xxxhdpi' = 192
}

foreach ($entry in $sizes.GetEnumerator()) {
    $directory = Join-Path $resRoot $entry.Key
    $size = [int]$entry.Value

    $squareIcon = New-LauncherBitmap -Size $size -Variant 'square'
    $squareIcon.Save((Join-Path $directory 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $squareIcon.Dispose()

    $roundIcon = New-LauncherBitmap -Size $size -Variant 'round'
    $roundIcon.Save((Join-Path $directory 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $roundIcon.Dispose()

    $foregroundIcon = New-LauncherBitmap -Size $size -Variant 'foreground'
    $foregroundIcon.Save((Join-Path $directory 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $foregroundIcon.Dispose()
}