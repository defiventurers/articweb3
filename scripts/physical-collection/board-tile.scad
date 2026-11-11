// Antarctic Gaming Co. prototype-only FDM board base, units millimetres.
// Print four copies (2x2 square). Apply the source-native board artwork as a flat laminate.
// This CAD does not replace exact game topology or approved sculpt designs.
side = 158;
thickness = 4;
$fn = 48;
linear_extrude(height = thickness)
  offset(r = 2) offset(delta = -2) square([side,side], center = true);
