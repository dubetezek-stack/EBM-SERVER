(function() {
  const startLat = -27.4352390;
  const startLon = -48.5138060;
  let lat = startLat;
  let lon = startLon;
  let ele = 15.0; // start at 15m elevation
  let time = new Date('2025-06-01T11:16:36Z');
  
  let gpxPoints = [];
  
  // 900 seconds (15 minutes of data)
  const numPoints = 900;
  
  let speed = 8.0; // m/s (~28.8 km/h)
  let hr = 135;
  let cad = 85;
  let temp = 19;
  
  for (let i = 0; i < numPoints; i++) {
    // Generate realistic path: a big loop or figure 8
    // Heading angle in radians - changes gradually to complete a loop
    const heading = (i / numPoints) * 2 * Math.PI + Math.sin((i / numPoints) * 4 * Math.PI) * 0.5;
    
    // Elevation profile: flat first 150s, climb from 150s to 450s, crest to 500s, descent from 500s to 750s, flat to finish
    let grade = 0;
    if (i >= 150 && i < 450) {
      grade = 0.055; // 5.5% climb
    } else if (i >= 450 && i < 500) {
      grade = 0.005; // flattening out at the crest
    } else if (i >= 500 && i < 700) {
      grade = -0.075; // -7.5% descent
    } else if (i >= 700 && i < 750) {
      grade = -0.015;
    }
    
    // Calculate elevation change
    const distStep = speed * 1.0; // 1 second intervals
    const eleDiff = distStep * grade;
    ele += eleDiff;
    
    // Physics based power estimation
    // Power = P_gravity + P_rolling + P_air + P_accel
    const mass = 85; // kg (rider + bike)
    const g = 9.81;
    const pGravity = mass * g * grade * speed;
    const pAir = 0.5 * 0.35 * 1.2 * Math.pow(speed, 3);
    const pRolling = mass * g * 0.004 * speed;
    let power = Math.max(0, pGravity + pAir + pRolling);
    
    // Add noise and draft / coasting logic
    if (grade < -0.03) {
      power = 0; // coasting on descent
      cad = 0;
      hr = Math.max(110, hr - 0.3);
      speed = Math.min(17.5, speed + 0.15); // accelerate downhill up to 63 km/h
    } else {
      // Pedaling
      if (cad === 0) cad = 80;
      cad = Math.round(85 + Math.sin(i / 12) * 4 + (Math.random() - 0.5) * 3);
      power = Math.round(power + (Math.random() - 0.5) * 40);
      if (power < 90) power = 90; // minimum pedaling power
      if (power > 550) power = 550; // max cap for realistic rider
      
      // Heart rate lags power changes
      const targetHR = 125 + (power / 450) * 55;
      hr += (targetHR - hr) * 0.04;
      hr = Math.round(hr);
      
      // Speed adjustments
      const targetSpeed = Math.max(3.8, 9.8 - grade * 70 + (Math.random() - 0.5) * 0.4); // climb slow, flat fast
      speed += (targetSpeed - speed) * 0.08;
    }
    
    // Update lat/lon using simple spherical approximation
    const dLat = (speed * Math.cos(heading)) / 111000;
    const dLon = (speed * Math.sin(heading)) / (111000 * Math.cos(lat * Math.PI / 180));
    lat += dLat;
    lon += dLon;
    
    // Time step
    time.setSeconds(time.getSeconds() + 1);
    const timeStr = time.toISOString();
    
    // Temperature drops slightly with altitude
    temp = Math.round(19.0 - (ele - 15) * 0.008 + (Math.random() - 0.5) * 0.1);
    
    gpxPoints.push(`   <trkpt lat="${lat.toFixed(7)}" lon="${lon.toFixed(7)}">
    <ele>${ele.toFixed(1)}</ele>
    <time>${timeStr}</time>
    <extensions>
     <power>${Math.round(power)}</power>
     <gpxtpx:TrackPointExtension>
      <gpxtpx:atemp>${temp}</gpxtpx:atemp>
      <gpxtpx:hr>${Math.round(hr)}</gpxtpx:hr>
      <gpxtpx:cad>${Math.round(cad)}</gpxtpx:cad>
     </gpxtpx:TrackPointExtension>
    </extensions>
   </trkpt>`);
  }
  
  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="StravaGPX" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">
 <metadata>
  <time>2025-06-01T11:16:36Z</time>
 </metadata>
 <trk>
  <name>Morning Ride - Florianópolis Loop</name>
  <type>cycling</type>
  <trkseg>`;
  
  const gpxFooter = `  </trkseg>
 </trk>
</gpx>`;

  window.sampleGPX = gpxHeader + '\n' + gpxPoints.join('\n') + '\n' + gpxFooter;
})();
