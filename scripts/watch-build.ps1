# Watch EAS Build Progress
# Press Ctrl+C to stop

$buildId = "96c1afdc-2f78-4bbf-b9cd-77799af55108"

Write-Host "Watching build: $buildId" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

while ($true) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] Checking build status..." -ForegroundColor Gray
    
    # Get build status
    $output = eas build:view $buildId 2>&1 | Out-String
    
    # Extract status
    if ($output -match "Status\s+(.+)") {
        $status = $matches[1].Trim()
        
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "  Build Status: " -NoNewline
        
        switch ($status) {
            "finished" {
                Write-Host "✅ FINISHED" -ForegroundColor Green
                Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "Build completed successfully!" -ForegroundColor Green
                Write-Host "Download APK from: https://expo.dev/accounts/prithviraj_12/projects/apex/builds/$buildId"
                break
            }
            "errored" {
                Write-Host "❌ FAILED" -ForegroundColor Red
                Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "Build failed. Check logs at:" -ForegroundColor Red
                Write-Host "https://expo.dev/accounts/prithviraj_12/projects/apex/builds/$buildId"
                break
            }
            "in progress" {
                Write-Host "⏳ IN PROGRESS" -ForegroundColor Yellow
                Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
            }
            "in queue" {
                Write-Host "⏸️  IN QUEUE" -ForegroundColor Yellow
                Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
            }
            default {
                Write-Host "$status" -ForegroundColor White
                Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
            }
        }
        
        # If build is done, exit
        if ($status -eq "finished" -or $status -eq "errored" -or $status -eq "canceled") {
            break
        }
    }
    
    Write-Host ""
    Write-Host "Next check in 30 seconds..." -ForegroundColor Gray
    Write-Host ""
    
    Start-Sleep -Seconds 30
}

Write-Host ""
Write-Host "Monitoring stopped." -ForegroundColor Cyan
