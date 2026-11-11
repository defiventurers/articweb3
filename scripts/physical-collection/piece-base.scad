// Antarctic Gaming Co. prototype-only token shell, mm. No final sculpting implied.
// CLI example: openscad -o piece.stl -D 'shape="hex"' -D 'diameter=15' piece-base.scad
shape = is_undef(shape) ? "round" : shape;
diameter = is_undef(diameter) ? 20 : diameter;
height = is_undef(height) ? 5 : height;
$fn=72;
module outline() {
  if(shape=="hex") circle(d=diameter,$fn=6);
  else if(shape=="wedge") polygon([[0,diameter*.56],[diameter*.45,-diameter*.28],[diameter*.33,-diameter*.47],[-diameter*.33,-diameter*.47],[-diameter*.45,-diameter*.28]]);
  else circle(d=diameter);
}
linear_extrude(height=height) outline();
