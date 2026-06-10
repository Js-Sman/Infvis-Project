# InfVis Project — File Structure Setup
# Run this script from the root of the new project directory after scaffolding with Vite.
# Creates all directories and placeholder files defined in the Masterprompt (Section 2).
# Existing files are never overwritten.

$files = @(
    "src/components/header/Header.jsx",
    "src/components/header/SearchBar.jsx",
    "src/components/map/MapView.jsx",
    "src/components/map/CountryPath.jsx",
    "src/components/map/ContinentZone.jsx",
    "src/components/starplot/StarPlot.jsx",
    "src/components/starplot/StarAxis.jsx",
    "src/components/starplot/SpikeDot.jsx",
    "src/components/linechart/LineChart.jsx",
    "src/components/timeline/Timeline.jsx",
    "src/components/timeline/PlaybackControls.jsx",
    "src/components/ui/FloatingPanel.jsx",
    "src/components/ui/LegendPanel.jsx",
    "src/components/ui/SplitScreenContainer.jsx",
    "src/hooks/useDataset.js",
    "src/hooks/useZoom.js",
    "src/utils/dataService.js",
    "src/utils/continentAggregation.js",
    "src/utils/normalize.js",
    "src/config/continentConfig.js",
    "src/config/textConfig.js",
    "src/store/appStore.js",
    "src/theme.js"
)

Write-Host ""
Write-Host "Creating InfVis project structure..." -ForegroundColor Cyan
Write-Host ""

$created = 0
$skipped = 0

foreach ($file in $files) {
    $dir = Split-Path $file -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    if (-not (Test-Path $file)) {
        New-Item -ItemType File -Path $file | Out-Null
        Write-Host "  [created]  $file" -ForegroundColor Green
        $created++
    } else {
        Write-Host "  [exists]   $file" -ForegroundColor DarkGray
        $skipped++
    }
}

# Create src/data/ directory without a placeholder file (CSVs go here manually)
if (-not (Test-Path "src/data")) {
    New-Item -ItemType Directory -Path "src/data" -Force | Out-Null
    Write-Host "  [created]  src/data/" -ForegroundColor Green
} else {
    Write-Host "  [exists]   src/data/" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Done. $created file(s) created, $skipped already existed." -ForegroundColor Cyan
Write-Host ""

