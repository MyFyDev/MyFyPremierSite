param([string[]]$Bases = @('home','contact','privacy','terms'))
$dir = "C:\Users\bturner_rvfinancingu\Documents\premier\site\_build\_audit"
function px($s){ if($s -match '([\d.]+)px'){return [double]$matches[1]} else {return $null} }
function key($t){ if(-not $t){return ''}; return $t.Substring(0,[Math]::Min(38,$t.Length)).ToLower() }
foreach($Base in $Bases){
  $lp="$dir\live-$Base.json"; $mp="$dir\loc-$Base.json"
  if(-not (Test-Path $lp) -or -not (Test-Path $mp)){ Write-Output "## $Base : missing capture"; continue }
  $L=Get-Content $lp -Raw | ConvertFrom-Json
  $M=Get-Content $mp -Raw | ConvertFrom-Json
  Write-Output ("`n================ {0}  (live w={1} / loc w={2}) ================" -f $Base,$L.w,$M.w)
  Write-Output ("BODY  L: {0} {1}/{2} ls={3} {4}" -f $L.body.ff,$L.body.fs,$L.body.lh,$L.body.ls,$L.body.col)
  Write-Output ("BODY  M: {0} {1}/{2} ls={3} {4}" -f $M.body.ff,$M.body.fs,$M.body.lh,$M.body.ls,$M.body.col)
  if($L.headerInfo -or $M.headerInfo){
    Write-Output ("NAVBAR L: bg={0} bb={1} h={2}" -f $L.headerInfo.bg,$L.headerInfo.bb,$L.headerInfo.h)
    Write-Output ("NAVBAR M: bg={0} bb={1} h={2}" -f $M.headerInfo.bg,$M.headerInfo.bb,$M.headerInfo.h)
  }
  # headings matched by text prefix
  $lh=@{}; foreach($h in $L.heads){ $k=key $h.t; if($k -and -not $lh.ContainsKey($k)){$lh[$k]=$h} }
  $mh=@{}; foreach($h in $M.heads){ $k=key $h.t; if($k -and -not $mh.ContainsKey($k)){$mh[$k]=$h} }
  $keys=@($lh.Keys + $mh.Keys | Select-Object -Unique | Sort-Object)
  Write-Output "-- HEADINGS --"
  foreach($k in $keys){
    $a=$lh[$k]; $b=$mh[$k]
    $as= if($a){"{0} {1}/{2} {3} {4}" -f $a.tag,$a.fs,$a.fw,$a.col,$a.ta}else{"—"}
    $bs= if($b){"{0} {1}/{2} {3} {4}" -f $b.tag,$b.fs,$b.fw,$b.col,$b.ta}else{"—"}
    $flag=""
    if($a -and $b){
      if([Math]::Abs((px $a.fs)-(px $b.fs)) -gt 1.5){$flag+=" *SIZE"}
      if($a.col -ne $b.col){$flag+=" *COLOR"}
      if($a.fw -ne $b.fw){$flag+=" *WT"}
      if($a.ff -ne $b.ff){$flag+=" *FONT($($a.ff)/$($b.ff))"}
    } elseif($a){$flag=" *LIVE-ONLY"} else {$flag=" *LOC-ONLY"}
    Write-Output ("  `"{0}`"" -f $a.t ?? $b.t)
    Write-Output ("      L: {0}" -f $as)
    Write-Output ("      M: {0}{1}" -f $bs,$flag)
  }
  # nav links
  Write-Output "-- NAV LINKS (text : fs/fw col ff) --"
  $ln=@{}; foreach($n in $L.navlinks){ if(-not $ln.ContainsKey($n.t)){$ln[$n.t]=$n} }
  $mn=@{}; foreach($n in $M.navlinks){ if(-not $mn.ContainsKey($n.t)){$mn[$n.t]=$n} }
  foreach($k in @($ln.Keys+$mn.Keys|Select-Object -Unique|Sort-Object)){
    $a=$ln[$k]; $b=$mn[$k]
    Write-Output ("  {0,-16} L:{1} M:{2}" -f $k, ($(if($a){"$($a.fs)/$($a.fw) $($a.col) $($a.ff)"}else{'—'})), ($(if($b){"$($b.fs)/$($b.fw) $($b.col) $($b.ff)"}else{'—'})))
  }
  # buttons
  Write-Output "-- BUTTONS --"
  foreach($x in $L.btns){ Write-Output ("  L {0,-22} fs={1} {2} bg={3} pad={4} br={5}" -f $x.t,$x.fs,$x.col,$x.bg,$x.pad,$x.br) }
  foreach($x in $M.btns){ Write-Output ("  M {0,-22} fs={1} {2} bg={3} pad={4} br={5}" -f $x.t,$x.fs,$x.col,$x.bg,$x.pad,$x.br) }
  # footer
  Write-Output ("-- FOOTER  (L footerTop={0} / M footerTop={1}) --" -f $L.footerTop,$M.footerTop)
  Write-Output "  [LIVE]"
  foreach($f in $L.footer){ Write-Output ("    {0,-7} {1,-6} {2,-18} {3}" -f $f.fs,$f.ta,$f.col,$f.t) }
  Write-Output "  [LOCAL]"
  foreach($f in $M.footer){ Write-Output ("    {0,-7} {1,-6} {2,-18} {3}" -f $f.fs,$f.ta,$f.col,$f.t) }
}
