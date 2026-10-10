"""Build the English Yan Yi rulebook with the complete user-supplied timed transcript.
Run from the repository root with Python + reportlab + Pillow.
The diagrams are exact vector drawings; token art comes from the 21 generated assets.
"""
from pathlib import Path
import argparse, re, html, json
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Table, TableStyle, Flowable, NextPageTemplate, KeepTogether
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / 'frontend/public/assets/heritage-arcade/sanguo-yan-yi'
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, default=ASSETS / 'Sanguo-Yan-Yi-Qi-Final-English-Rules.pdf')
args = parser.parse_args()
args.output.parent.mkdir(parents=True, exist_ok=True)
FONT_DIR = Path('/usr/share/fonts/truetype/dejavu')
for name, file in [('Body', 'DejaVuSans.ttf'), ('Bold', 'DejaVuSans-Bold.ttf'), ('Display', 'DejaVuSerif.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / file)))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='Bold', italic='Body', boldItalic='Bold')
INK = colors.HexColor('#183443'); MUTED = colors.HexColor('#49616d'); GOLD = colors.HexColor('#a77932'); PALE = colors.HexColor('#eef4f6')
F = {'blue': colors.HexColor('#2686b9'), 'green': colors.HexColor('#248c65'), 'red': colors.HexColor('#bf5354'), 'han': colors.HexColor('#b58531')}
W, H = A4; M = 43; CW = W - M * 2
styles = {
    'body': ParagraphStyle('body', fontName='Body', fontSize=9.4, leading=14.6, textColor=INK, spaceAfter=9),
    'small': ParagraphStyle('small', fontName='Body', fontSize=8.0, leading=11.5, textColor=MUTED, spaceAfter=6),
    'h1': ParagraphStyle('h1', fontName='Display', fontSize=27, leading=32, textColor=INK, spaceAfter=16),
    'h2': ParagraphStyle('h2', fontName='Bold', fontSize=12, leading=17, textColor=INK, spaceBefore=9, spaceAfter=7),
    'tag': ParagraphStyle('tag', fontName='Bold', fontSize=8, leading=12, textColor=GOLD, spaceAfter=9),
    'cell': ParagraphStyle('cell', fontName='Body', fontSize=8.2, leading=12, textColor=INK),
    'cellsmall': ParagraphStyle('cellsmall', fontName='Body', fontSize=6.8, leading=10, textColor=MUTED, alignment=TA_CENTER),
    'cover': ParagraphStyle('cover', fontName='Display', fontSize=36, leading=41, textColor=colors.white, spaceAfter=15),
    'coversmall': ParagraphStyle('coversmall', fontName='Body', fontSize=10, leading=16, textColor=colors.HexColor('#c1d7e0'), spaceAfter=15),
    'cue': ParagraphStyle('cue', fontName='Body', fontSize=8.2, leading=12.0, textColor=INK, spaceAfter=5.8),
    'index': ParagraphStyle('index', fontName='Bold', fontSize=7.4, leading=10, textColor=GOLD),
}
def P(text, kind='body'): return Paragraph(text, styles[kind])
def table(rows, widths, header=True):
    data = [[P(str(cell), 'cell') if not isinstance(cell, (list, Flowable)) else cell for cell in row] for row in rows]
    t = Table(data, colWidths=widths, hAlign='LEFT', repeatRows=1 if header else 0)
    commands = [('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9), ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8), ('LINEBELOW', (0, 0), (-1, -1), .45, colors.HexColor('#d6e1e5'))]
    if header: commands += [('BACKGROUND', (0, 0), (-1, 0), PALE), ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#a7bec9'))]
    t.setStyle(TableStyle(commands)); return t

def local(f, file, depth):
    return {'blue': (file + 4, depth), 'red': (12 - file, 16 - depth), 'green': (16 - depth, file + 4), 'han': (depth, 12 - file)}[f]
def opening():
    out=[]
    for f in ['blue','green','red']:
        for file, role in enumerate(['R','H','E','A','K','A','E','H','R']): out.append((f, role, *local(f,file,0)))
        for file in [1,7]: out.append((f,'C',*local(f,file,2)))
        for file in [0,2,4,6,8]: out.append((f,'P',*local(f,file,3)))
    out += [('han','R',3,y) for y in [6,8,10]] + [('han','C',2,8),('han','Hn',0,8)]
    return out

class CrossBoard(Flowable):
    def __init__(self, size=470, dark=False, setup=True): super().__init__(); self.width=size; self.height=size; self.dark=dark; self.setup=setup
    def draw(self):
        c=self.canv; size=self.width; step=(size-62)/16; offset=31
        def pt(x,y): return offset+x*step, size-offset-y*step
        bg=colors.HexColor('#123040') if self.dark else colors.HexColor('#f2f7f8')
        c.setFillColor(bg);c.roundRect(0,0,size,size,12,fill=1,stroke=0)
        for f,rect in [('blue',(4,0,8,4)),('red',(4,12,8,4)),('green',(12,4,4,8)),('han',(0,4,4,8))]:
            x,y,w,h=rect;px,py=pt(x,y+h);c.setFillColor(F[f]);c.setFillAlpha(.14 if self.dark else .08);c.rect(px,py,w*step,h*step,fill=1,stroke=0);c.setFillAlpha(1)
        c.setStrokeColor(colors.HexColor('#587a89') if self.dark else colors.HexColor('#a9bdc6'));c.setLineWidth(.6)
        for i in range(17):
            left,right=(0,16) if 4<=i<=12 else (4,12)
            c.line(*pt(left,i),*pt(right,i));c.line(*pt(i,left),*pt(i,right))
        for f, corners in [('blue',(7,0,9,2)),('red',(7,14,9,16)),('green',(14,7,16,9)),('han',(0,7,2,9))]:
            x1,y1,x2,y2=corners;c.setStrokeColor(F[f]);c.setLineWidth(1.2);c.line(*pt(x1,y1),*pt(x2,y2));c.line(*pt(x2,y1),*pt(x1,y2))
        c.setFont('Bold',8);c.setFillColor(colors.HexColor('#d8e7ed') if self.dark else INK)
        c.drawCentredString(size/2,size-15,'WEI / BLUE');c.drawCentredString(size/2,7,'SHU / RED')
        c.saveState();c.translate(size-10,size/2);c.rotate(-90);c.drawCentredString(0,0,'WU / GREEN');c.restoreState()
        c.saveState();c.translate(12,size/2);c.rotate(90);c.drawCentredString(0,0,'HAN / GOLD');c.restoreState()
        c.setFont('Body',6.6);c.setFillColor(colors.HexColor('#90aebc') if self.dark else MUTED)
        for x,y in [(1.9,1.8),(14.1,1.8),(1.9,14.1),(14.1,14.1)]:
            px,py=pt(x,y);c.drawCentredString(px,py,'EXCLUDED')
        if self.setup:
            for f,role,x,y in opening():
                px,py=pt(x,y);c.setFillColor(F[f]);c.setStrokeColor(colors.white);c.setLineWidth(.5);c.circle(px,py,step*.36,fill=1,stroke=1);c.setFillColor(colors.white);c.setFont('Bold',7 if role!='Hn' else 5.5);c.drawCentredString(px,py-2.4,role)
        else:
            for x,y,label,f in [(0,7,'SHU','red'),(1,8,'WU','green'),(0,9,'WEI','blue')]:
                px,py=pt(x,y);c.setFillColor(F[f]);c.circle(px,py,step*.44,fill=1,stroke=0);c.setFont('Bold',5.8);c.setFillColor(colors.white);c.drawCentredString(px,py-2,label)

class Sprite(Flowable):
    def __init__(self, path, size=46): super().__init__();self.path=path;self.width=size;self.height=size
    def draw(self): self.canv.drawImage(ImageReader(str(self.path)),0,0,self.width,self.height,mask='auto')

class MoveDiagram(Flowable):
    def __init__(self, kind, width=155):super().__init__();self.kind=kind;self.width=width;self.height=145
    def draw(self):
        c=self.canv;kind=self.kind;w=self.width
        cols,rows=(9,5) if kind=='Elephant' else (5,5) if kind=='Horse' else (3,3)
        step=min((w-20)/(cols-1),24);sx=(w-(cols-1)*step)/2;sy=30
        c.setStrokeColor(colors.HexColor('#b1c7d1'));c.setLineWidth(.6)
        for x in range(cols):c.line(sx+x*step,sy,sx+x*step,sy+(rows-1)*step)
        for y in range(rows):c.line(sx,sy+y*step,sx+(cols-1)*step,sy+y*step)
        points=[(2+dx,2+dy) for dx,dy in [(2,1),(2,-1),(-2,1),(-2,-1),(1,2),(1,-2),(-1,2),(-1,-2)]] if kind=='Horse' else [(0,0),(2,0),(1,1),(0,2),(2,2)] if kind=='Advisor' else [(2,0),(6,0),(0,2),(4,2),(8,2),(2,4),(6,4)]
        for x,y in points:c.setFillColor(F['blue']);c.circle(sx+x*step,sy+y*step,3.5,fill=1,stroke=0)
        if kind=='Horse':c.setFillColor(GOLD);c.circle(sx+2*step,sy+2*step,6,fill=1,stroke=0);c.setFillColor(colors.white);c.setFont('Bold',7);c.drawCentredString(sx+2*step,sy+2*step-2.5,'H')
        c.setFillColor(INK);c.setFont('Bold',9);c.drawCentredString(w/2,12,kind)

def on_page(c, doc):
    if doc.page==1:
        c.setFillColor(colors.HexColor('#071d29'));c.rect(0,0,W,H,fill=1,stroke=0)
        c.setFillColor(colors.HexColor('#c7dce5'));c.setFont('Body',7);c.drawString(M,28,'ARCTIC DOMINION  /  ENGLISH FREE PLAY EDITION  /  2026-10-10')
    else:
        c.setFillColor(INK);c.setFont('Bold',7.5);c.drawString(M,H-28,'SANGUO YAN YI QI')
        c.setFillColor(GOLD);c.setFont('Body',7);c.drawRightString(W-M,H-28,'RULEBOOK + COMPLETE TIMED TRANSCRIPT')
        c.setStrokeColor(colors.HexColor('#d4e1e6'));c.setLineWidth(.5);c.line(M,H-37,W-M,H-37)
        c.setFillColor(MUTED);c.setFont('Body',7);c.drawString(M,29,'Tutorial Free Play edition  |  21 individual faction sprites')
        c.drawRightString(W-M,29,str(doc.page))

doc=BaseDocTemplate(str(args.output),pagesize=A4,leftMargin=M,rightMargin=M,topMargin=48,bottomMargin=49,title='Sanguo Yan Yi Qi - Final English Rules and Timed Transcript',author='Arctic Dominion',pageCompression=1)
single=Frame(M,49,CW,H-97,id='single',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
gap=20;col=(CW-gap)/2
frames=[Frame(M,49,col,H-97,id='left',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0),Frame(M+col+gap,49,col,H-97,id='right',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)]
doc.addPageTemplates([PageTemplate(id='single',frames=[single],onPage=on_page),PageTemplate(id='transcript',frames=frames,onPage=on_page)])
story=[]
def add(text, kind='body'): story.append(P(text,kind))
def chapter(number,title,time=None):
    if story:story.append(PageBreak())
    add(f'{number:02d} / FIELD MANUAL'+(f'  |  TUTORIAL {time}' if time else ''),'tag');add(title,'h1')
def sub(title):add(title,'h2')

add('ARCTIC DOMINION / THREE KINGDOMS','tag')
add('SANGUO<br/>YAN YI QI','cover')
add('The final English Free Play rulebook<br/>Illustrated rules, 21 named pieces and the complete timed tutorial','coversmall')
board=CrossBoard(462,dark=True);board.hAlign='CENTER';story.append(board);story.append(Spacer(1,14))
add('225 intersections  /  53 starting pieces  /  3 kingdoms','coversmall')

chapter(1,'Which rules are we playing?','00:03-00:44')
add('This edition follows the Chinese <b>Free Play Method</b> tutorial supplied for this project. The speaker explicitly mixes official rules with private additions. The organized rules below keep that distinction; the complete 588-cue English transcript appears after the manual, so introductions, explanations, historical asides, examples and closing remarks remain available.')
story.append(table([['Label','Meaning at this table'],['Tutorial rule','A rule demonstrated or described in the supplied video. This is the default playable edition.'],['Agreed Free Play addition','A private or expanded convention described by the speaker, such as inherited Advisor palace transfers and restrictions protecting an ally.'],['Proposed option','Early-conquest Han balancing, suggested to the designers. It is NOT presented as an adopted official rule and defaults to off.'],['Written supplement','Differences and extra modes documented by the linked 2020 written article. They are recorded separately rather than silently changing the tutorial.'],['Digital convention','A necessary, disclosed adjudication for a situation the video does not settle. Examples: one Advisor per transfer move, explicit repeated-check counting, and stalemate passing.']],[110,CW-110]))
sub('Quick start')
for text in ['1. Place the three 16-piece armies and five Han pieces as in the opening diagram.', '2. Choose six or nine repeated checks for the previous-seat limit; leave the proposed Han balance option off unless everyone agrees.', '3. Wu / Green opens. Continue Wu, Wei, Shu, except that a single checked faction answers immediately.', '4. Move one controlled piece per turn. Use Horses to force alliances or seize Han. Keep your own and allied kings safe.', '5. Remove a mated king immediately and transfer its surviving army to the direct victor. Continue until one kingdom remains or the survivors draw.']:add(text)
add('The existing Arctic three-arm Sanguo Qi and San You Qi engines provide useful design patterns, but their Y-board junctions, blocked leaps, flying-General rules and extra Fire/Flag/Bannerman pieces are not imported into this cross-board ruleset. Standard Xiangqi supplies the seven-role vocabulary and line-capture model.','small')

chapter(2,'The board and opening armies','00:48-03:19')
add('Pieces occupy <b>intersections</b>, not squares. The lattice has 17 files and 17 ranks. Remove the four 4-by-4 corner blocks: 289 - 64 = <b>225 playable points</b>. The outside ornamental border is not a movement line. The central 8-by-8 square region is the common battlefield; each arm is a half-Xiangqi home sector.')
story.append(table([['Force','Arctic identity / position','Starting force'],['Wei','Pengu Order / Blue / top','16 pieces'],['Shu','Retsba Legion / Red / bottom','16 pieces'],['Wu','Abster Tribe / Green / right','16 pieces'],['Han','Gold neutral reserve / left','Emperor 1; Chariots 3; Cannon 1']],[70,250,CW-320]))
sub('Arrange each player army')
add('Along the outer back rank, from one side to the other: <b>Chariot, Horse, Elephant, Advisor, King, Advisor, Elephant, Horse, Chariot</b>. The King is on file 9; the Chariots are on files 5 and 13. The two Cannons stand two ranks in front of the back rank, under the Horse files. Five Soldiers stand three ranks in front of the back rank, on alternating points.')
add('The Soldier starting rank is the <b>defensive line</b>. The next line toward the center is the <b>national boundary</b>. Wu faces the initially inactive Han reserve, while Wei and Shu face each other. This asymmetry explains Wu moving first and the opening Cannon limitation.')
sub('Han setup and inactive status')
add('The Emperor starts at Luoyang, on the middle point of the left outer edge. The three Han Chariots stand on the Hulao Pass line, at two-point spacing above and below its center. The Han Cannon is one point behind the middle Chariot. In global diagram coordinates, Emperor (0,8); Chariots (3,6), (3,8), (3,10); Cannon (2,8). Global coordinates count left-to-right and top-to-bottom from 0 to 16.')
add('Before activation, Han pieces cannot move or be captured. The sole exception is a Horse capturing the Emperor to trigger regicide. Inactive Han pieces still block line movement and may serve as Cannon screens. There are <b>48 player pieces plus 5 Han pieces</b>; the 21 illustrations are seven role designs times three player colors, not the number of pieces on the board.')
add('Diagram key: K King; A Advisor; E Elephant; H Horse; R Chariot; C Cannon; P Soldier; Hn Han Emperor.','small')

chapter(3,'The 21 individually named pieces')
add('Each illustration is a separate transparent 512-by-512 WebP file. The physical role, move and starting quantity are identical across the three factions; faction color identifies its original army. A controller ring identifies a later inherited piece. The Han reserve uses dedicated gold markers on the board.')
roles=[('king','Frost King',1),('advisor','Shield Guard',2),('elephant','Royal Mammoth',2),('horse','Ice Unicorn',2),('chariot','War Chariot',2),('cannon','Frost Cannon',2),('soldier','Penguin Spearman',5)]
rows=[['Role / copies','Blue / Pengu Order','Green / Abster Tribe','Red / Retsba Legion']]
for role,name,count in roles:
    row=[f'<b>{name}</b><br/>{role.title()} x {count}']
    for f in ['blue','green','red']:
        sprite=Sprite(ASSETS/'pieces'/f'{f}-{role}.webp',44);sprite.hAlign='CENTER'
        row.append([sprite,P(f'{f}-{role}.webp','cellsmall')])
    rows.append(row)
story.append(table(rows,[125,(CW-125)/3,(CW-125)/3,(CW-125)/3]))
add('The names above retain the historical role in the inspector and movement manual: the Unicorn is a Horse, the Mammoth an Elephant, the Shield Guard an Advisor, and the Penguin Spearman a Soldier. Artwork changes do not add abilities.','small')

chapter(4,'How the seven roles move','03:22-09:14')
story.append(table([['Piece','Legal movement / capture'],['King','One orthogonal point within its own nine-point palace. Wei and Shu may face directly in this video edition. A mated King loses its kingdom.'],['Advisor','One diagonal point along the five connected palace points. Inherited Advisors have a separate palace-transfer move; see inheritance.'],['Elephant','Two points diagonally, among its seven home points. No blocked-eye restriction. It cannot capture another home Elephant across a national boundary it is not allowed to cross.'],['Horse','Two points along one axis and one along the other. No blocked-leg restriction. Its straight and diagonal components must remain on the cross. Only Horses trigger alliances or regicide.'],['Chariot','Any number of points on a clear horizontal or vertical line. It captures the first enemy on its destination. It cannot jump over any piece.'],['Cannon','Move like a Chariot without capture. A capture must pass exactly one occupied point, of any side. It cannot capture with zero or two screens. Opening restriction: see next page.'],['Soldier','One orthogonal point. At home: forward or sideways. Beyond its own national boundary: all four directions, but retreat only as far as its own boundary.']],[84,CW-84]))
story.append(Spacer(1,13));story.append(Table([[MoveDiagram('Horse'),MoveDiagram('Advisor'),MoveDiagram('Elephant')]],colWidths=[CW/3]*3));
add('Blue dots mark geometric destinations or the complete palace/home-point network, before occupants and king safety are considered. An occupied Horse leg or Elephant eye does not block its jump; a missing board corner still blocks the route.','small')
add('Move exactly one piece per turn. Friendly and allied occupied destinations are unavailable. Captures remove the opposing piece and place the moving piece on its point. Active Kings are resolved by checkmate, not clicked and captured as ordinary tokens.')

chapter(5,'Boundaries, corners and opening fire','05:21-09:34; 22:40-25:07')
sub('Soldiers: the national boundary is decisive')
add('A Soldier may move sideways from its first move. It may advance from its defensive line to its national boundary, but cannot retreat from that boundary to the defensive line. Once it advances beyond the boundary, it may move forward, sideways or backward, even in another kingdom or Han territory. Its backward return stops at its own national boundary. It never changes into a forward-only enemy Soldier just because it enters enemy territory.')
add('For example, Blue advances toward increasing global y. On y=3 it may step to y=4 or sideways, never y=2. On y=4 it may advance to y=5 or move sideways, never y=3. On y=5 it may return to y=4. An inherited Soldier uses the receiving controller\'s forward direction and boundary.')
sub('Cannons: the first full round')
add('The video forbids a Cannon moving beyond the starting Soldier defensive line during the very first round. From its starting rank it can move sideways, or one point forward or backward. This restriction applies to the opening round of the game, <b>not to the first move of every individual Cannon</b>. It disappears in the middle game.')
add('The speaker explains that unrestricted opening Cannons would let Wei and Shu endanger a Wu Chariot before Wu can set up its defence. Wu can use its first turn to shift a Cannon, develop a Horse, or slide a Soldier. A connected Soldier line gives strong defensive support.')
sub('The missing corners are real restrictions')
add('No piece may occupy the outer ornamental border or any of the four blank corner regions. Chariot and Cannon rays stop where the playable cross ends. Soldiers cannot step into the blank area. A Horse requires a valid straight first point and a diagonal continuation that stays on the cross; a valid endpoint alone is insufficient. An Elephant\'s diagonal route must also stay inside the cross.')
add('This is a route restriction, not the ordinary Xiangqi blocked-leg/blocked-eye rule. Occupied intermediate points do not stop Horse or Elephant jumps. The board artwork and pixel spacing never decide legality; the engine uses exact integer cross-board coordinates.')
sub('Inactive Han as terrain')
add('Before activation, the Emperor, three Chariots and Cannon are immobile obstacles. Any of them may be the single screen for an otherwise valid Cannon capture. A Chariot facing the same blocked line cannot capture through the Han piece. The inactive Han military units themselves cannot be captured.')

chapter(6,'Turn order, check and repeated checks','09:40-10:59; 19:35-22:20')
sub('Normal sequence')
add('<b>Wu / Green → Wei / Blue → Shu / Red → Wu</b>, skipping defeated factions. On an ordinary turn, make one legal move with one piece under your control. You must not leave your own King in check.')
sub('A single checked faction answers immediately')
add('If Wei checks Wu, Wu responds immediately, even though Shu would normally follow Wei. After Wu answers, play continues with Wu\'s next player: Wei. Wei therefore gets another move. The speaker encourages attacking the previous player because this can change the tempo. If two or more factions are checked simultaneously, keep the normal seat order. Remove a checkmated King as soon as the mate is established.')
sub('Allied king safety in this Free Play edition')
add('Allied pieces do not give check to one another. A King may safely stand behind or within the attack pattern of an allied piece. However, in the video\'s protective convention, an ally must not move a shielding piece so as to expose the allied King to an enemy attack. A pinned allied Chariot may keep moving along the shielding file but may not slide away from it.')
sub('Perpetual check against the previous seat')
add('Agree on six or nine rounds before play. Repeating an unchanged checking cycle against your previous seat interrupts the third player\'s opportunities; the speaker treats this as prohibited once the agreed threshold is reached. If the checker refuses to change, it loses and its surviving army passes to the checked previous player. Perpetual check against the next seat is allowed because normal turn order is preserved.')
add('<b>Digital counting convention:</b> this table counts repeated checking positions in a continuous cycle against the previous seat. A new position or capture resets the count. It warns on the selected sixth or ninth repeated check; another unchanged repetition forfeits. A progressing series of distinct checks is not penalized, and a completed mate takes priority over the repetition penalty. This precise counter is implementation detail supplied for consistency where the narration only gives a six-or-nine-round choice.','small')

chapter(7,'Alliance, regicide and the Han reserve','11:01-15:39')
story.append(table([['Horse action','Alliance','Han controller'],['Lands on its own faction\'s point','No change','No change'],['Lands on another faction\'s point while all three survive','Mover + marked faction','The third faction'],['Captures the inactive Emperor','The other two survivors unite, if both remain','The Horse\'s controller'],['Later visits an alliance / regicide point after activation','No new effect','Existing controller keeps Han']],[215,150,CW-365]))
sub('How a Horse forces an alliance')
add('Beside the Emperor: the <b>upper point is Shu</b>, the <b>right point is Wu</b>, the <b>lower point is Wei</b>. A Horse landing on another faction\'s marked point creates the alliance instantly. It does not require consent, and an accidental landing counts. Your own marked point is an ordinary destination with no effect. The allies cannot capture or check one another; they attack the third kingdom, which gains the three Han Chariots and Cannon.')
sub('How a Horse seizes Han')
add('Only a Horse can capture the inactive Emperor. Its controller gains the three Han Chariots and Cannon. If two other kingdoms survive, they ally automatically against the regicide faction. The tutorial moves the Han token to the receiving ruler\'s position as a marker: it still represents that faction\'s original King, with the same identity, palace and defeat condition. This table follows that marker convention and vacates the Emperor\'s old point on activation.')
sub('When an alliance ends')
add('No player may cancel it voluntarily or replace it by visiting a different point. It dissolves automatically when one ally is defeated or the common opponent is defeated. The remaining kingdoms become enemies. Han units remain with their controller and transfer with its army if that controller is checkmated. Activation is a one-time event. If only two kingdoms remain before any activation, alliance points have no effect, but Horse regicide can still claim Han.')
sub('The proposed balance option')
add('The speaker suggests that if a kingdom checkmates another before alliance or regicide, Han should automatically reinforce the third kingdom. Example: Wei defeats Wu, so Shu receives Han to offset Wei\'s inherited army. The designers only said they would consider the idea. It is a <b>proposal</b>, not an adopted rule. The game offers it as an explicitly labeled, off-by-default house option.')

chapter(8,'Defeat, inheritance and defence','15:46-20:26')
sub('Checkmate and army ownership')
add('When a King has no legal response to check, that faction loses immediately. Remove the King. Every surviving piece controlled by the defeated faction passes to the victor, including Advisors, Elephants and already-activated Han pieces. The original artwork stays; a controller ring and ownership tag show the new allegiance. A conquered army that later loses transfers onward to the final victor.')
add('When two attackers combine, credit the faction that can directly deliver the mate with its own controlled forces. If the moving faction also directly checks the mated King, prefer it. If its move merely opens another faction\'s attack or supplies that faction\'s Cannon screen, the direct checking faction inherits. A tactical contribution alone does not claim the army. This is the borrowed-knife distinction.')
sub('Inherited Advisors: palace transfer')
add('An inherited Advisor may be moved directly to an <b>empty, normally reachable Advisor point</b> in the receiving King\'s palace. It does not walk across the battlefield. The transfer consumes an entire move: no transfer followed by a second piece move. This table transfers one Advisor per turn. The receiving kingdom need not first lose one of its own Advisors, so inherited Advisors can reinforce an already occupied palace as long as a legal point is free.')
sub('Inherited Elephants: neighboring home networks')
add('Elephants may cross a conquered neighboring boundary to help defend the controller\'s homeland, one normal two-point diagonal jump at a time. The connected pair can be Wei–Wu or Shu–Wu. They still use the seven-point Elephant networks of controlled regions and still cannot cut a missing corner. Alliance alone does not transfer territorial control.')
add('Wei and Shu are opposite, so an inherited Elephant cannot cross enemy Wu to get between them. If the controller also owns Han, a route through Han can connect their home-point networks. The speaker notes that this is a long and dangerous journey: the Elephant could be captured en route, and in practice the rule is rarely useful.')
add('Do not confuse this Free Play defence expansion with ordinary Xiangqi, or with the later written edition\'s stricter stay-in-the-original-camp Advisors and Elephants. The comparison appendix records those differences.')

chapter(9,'Resignation, wins and draws','18:53-19:26; 25:20-26:16')
sub('Resignation leaves an inactive army')
add('A player may resign mid-game. Turn its King face down. Its pieces <b>stay exactly where they stand</b>, no longer move, and are not inherited by either opponent. They remain line blockers and Cannon screens. The other players <b>may capture them</b>: they do not become invulnerable stones. The remaining kingdoms may continue fighting or competing for still-inactive Han.')
add('A resigned kingdom is defeated and its seat is skipped. If it controlled Han, those Han units become inactive with the rest of its army; they do not reactivate under a new player. An existing alliance ends when a participating kingdom resigns.')
sub('Victory belongs to the final survivor')
add('A kingdom that eliminates both others wins. It may defeat them directly or inherit the forces of a kingdom that had already defeated one rival. Example: Wu defeats Wei, then Shu defeats Wu; Shu is the final winner. A former victor does not retain victory after its own King is mated.')
sub('A draw among the survivors')
add('If no surviving faction can checkmate another, the survivors draw. If Wu has already defeated Wei and then Wu and Shu cannot mate one another, Wu and Shu draw; Wei has lost. The game asks every surviving human player to approve a local draw. Bots accept that local agreement. It automatically draws when only non-mating home-defence roles remain, or all remaining seats lack legal moves.')
sub('Stalemate is a disclosed completion rule')
add('The supplied tutorial does not decide an unchecked seat with no legal move. The original 2007 patent permits that seat to pass. This Free Play implementation uses that pass convention and continues to the next surviving seat. It does not invent a victor from the last move. The later written article instead treats stalemate as a loss with cause-based inheritance; that separate rule is recorded in the supplement.')
add('There is no imported automatic threefold-repetition or 120-quiet-move draw in this edition. The previous-seat perpetual-check rule and agreed-draw controls are the relevant mechanisms.','small')

chapter(10,'Recording moves and historical time','26:28-32:15')
sub('Controller-relative files')
add('Number files <b>1 through 17 from each player\'s right to left</b>. The central King file is 9; starting Chariots occupy files 5 and 13. From Wu\'s view, files 1–4 extend toward Wei, and 14–17 toward Shu. Han has no separate notation. A Han unit uses the file numbers of whoever currently controls it.')
story.append(table([['Controller','Global point (x,y) becomes'],['Wei / Blue','File = 17 - x; depth = y + 1'],['Shu / Red','File = x + 1; depth = 17 - y'],['Wu / Green','File = 17 - y; depth = 17 - x']],[125,CW-125]))
add('The game journal records both start and destination, the controller, role, capture and political result. This is an unambiguous digital coordinate supplement to the traditional advance/retreat/sideways notation.')
sub('Identical pieces sharing a file')
add('Use <b>front / rear</b> for two; <b>front / middle / rear</b> for three. With more pieces on a single file, number them from the front: first, second, third, and so on. Lower numbers are farther forward from their controller\'s perspective. This applies to inherited armies and Han units too.')
add('Examples retained from the tutorial: two Cannons on Wei file 10 require “Rear Cannon, sideways to file 7.” A middle Cannon can similarly move sideways to file 7. Five Chariots on one file can be distinguished as “Fourth Chariot, sideways to file 9,” which is not “Chariot on file 4 to file 9.” In the hypothetical seven-Chariot case, “Sixth Chariot, sideways to file 7” identifies the sixth piece in the line.')
sub('Historical round labels are storytelling')
add('The narrator rejects one round per month: a 117-round game would finish the conflict in under ten years. One season per round gives four rounds per year; around 120 rounds gives thirty years, still short beside the AD 184–280 narrative span of 96 years. He therefore favors <b>one complete round as one year</b>, starting with the Yellow Turban Rebellion in AD 184. He contrasts this with the official AD 189 starting convention, tied to Dong Zhuo\'s upheaval. These are historical labels, not gameplay timers.')

chapter(11,'The tutorial\'s extra information','01:15-03:19; 32:21-36:48')
sub('Cities, editions and the historical setting')
story.append(table([['Faction','Capital / locations named by the narrator'],['Wei','Xuchang; Xuzhou, Runan, Xinye, Wancheng, Chang\'an'],['Wu','Jianye; Shouchun, Lujiang, Chaisang, Xiangyang, Jiangling'],['Shu','Chengdu; Yong\'an, Shangyong, Hanzhong, Jiange; one remaining city name is not identified in the narration'],['Han','Luoyang; Hulao Pass']],[70,CW-70]))
add('The speaker describes Wei before formal usurpation of Han, Shu after gaining Western Sichuan, and Liu Bei\'s deathbed entrustment at Yong\'an. He candidly says he enjoys the game more than he knows every historical story. His board is sixth edition; fifth and sixth use the same layout. First and second editions also named the Cannon locations, but those two labels were removed from the third edition onward.')
sub('Tactics explained, without overstating the examples')
add('<b>Borrowed knife (32:29–32:51).</b> Another player\'s next move may capture the piece you have induced an opponent to expose. The narrator demonstrates a Wei Horse that Shu can capture on its turn. Two-birds and three-birds combinations are mentioned but not worked through.')
add('<b>Chariot versus Horse near the Emperor (33:05–34:18).</b> In some approach positions one Chariot covers both of a Horse\'s regicide routes. Remember the four-small-squares pattern formed by their positions. Other approaches give two separated entry routes, requiring two Chariots. The spoken “here” references depend on the video\'s exact setup; no unseen coordinate is fabricated in this rulebook.')
add('<b>Han forks after alliance (34:24–36:18).</b> A Horse near Han can force both opponents to react, even at the price of sacrificing a Chariot to stop regicide. After an alliance activates Han, the alliance-making Horse can fork newly active Chariots, trade for a Chariot, or capture a Cannon and continue the fork. The narrator recommends moving the relevant Han Chariot well away. In his specific Shu–Wu example, two four-square patterns contain the Horse; this is not a blanket guarantee for every Shu–Wu alliance.')
add('The introduction credits another enthusiastic creator whose name could not be verified. The closing explains that earlier recordings were deleted and this tutorial was remade at that creator\'s urging. Those remarks, the brief unclear phrase near 21:49, and the unclear fork description near 35:34 are retained as marked transcript cues rather than silently omitted.','small')

chapter(12,'Written supplements and source notes')
add('The linked 2020 article was edited in 2021. Its extra rules are separate from the video edition. This concise comparison preserves the additional procedural facts without reproducing the article\'s prose. [B]','small')
story.append(table([['Written-edition difference [B]','Tutorial game setting'],['Facing Wei–Shu Kings forbidden.','Allowed.'],['Opening Cannon may reach national boundary.','Defensive-line limit.'],['Ally may expose allied King.','Allied King protected.'],['Inherited Advisors/Elephants stay in original camps.','Defence transfers allowed.'],['After alliance, Emperor remains immobile and invulnerable.','Royal-marker convention vacates Luoyang.'],['Resignation removes army; stalemate loses with cause-based inheritance.','Inactive capturable army; stalemate passes.']],[CW*.57,CW*.43]))
add('<b>Other written options [B]:</b> rapid finish compares material after the first defeat: Chariot 5, Horse/Cannon 3, Soldier/Advisor/Elephant 1, King uncounted. Fourth-edition character duels need named-character stickers, a die and three cards; their complete procedure is not supplied here. Match points: first defeated 1, second defeated 0, winner 2; surviving drawers 1 each; three-way draw 1 each. A three-player resignation scores -1; resignation with two remaining has no deduction. An optional, historically unstable extension promotes a Soldier at the center to Horse if its faction has no Horses; once per faction. None of these extras is enabled in this tutorial game.')
sub('Sources and authority')
add('[A] User-supplied audio: <b>Sanguo Yan Yi Qi “Free Play Method” introductory tutorial</b>, duration 36:51.814. The preserved English SRT contains 588 cues, ending at 36:48.760; the remaining tail is not assigned invented speech. Source times cited in the manual refer to that audio.')
add('[B] User-linked Bilibili article: <link href="https://www.bilibili.com/opus/380944400655958160" color="#2686b9">bilibili.com/opus/380944400655958160</link> (also cv5726320), introductory rules with later written clarifications. Differences are recorded above.')
add('[C] Original board-and-rules patent CN2870925Y, published 2007: <link href="https://patents.google.com/patent/CN2870925Y/zh" color="#2686b9">patents.google.com/patent/CN2870925Y/zh</link>. Confirms the cross-board, 53 pieces and neutral reserve; earlier details such as the opening seat or Emperor treatment must not override the supplied tutorial.')
add('[D] World Xiangqi Federation: <link href="https://www.wxf-xiangqi.org/images/xiangqi-intro/xiangqi-introduction-for-wxf.pdf" color="#2686b9">A Short Introduction to Xiangqi</link>. Used for vocabulary and ordinary role mechanics, with this variant\'s explicit exceptions. Arctic\'s existing Xiangqi, historical Sanguo Qi and San You Qi source engines were reviewed for presentation, role naming and validation patterns.')

chapter(13,'Using the game and English subtitles')
sub('Open the campaign')
add('<link href="https://arcticdominion.xyz/?game=heritage-arcade&amp;table=sanguo" color="#2686b9">arcticdominion.xyz/?game=heritage-arcade&amp;table=sanguo</link> opens this edition. The main Heritage Arcade features it too. Choose three humans on one device, two humans plus a bot, or one human plus two bots. Choose your faction and Casual or Tactical bots when applicable.')
add('Select any piece to inspect it. On your turn, select one controlled piece and click a glowing intersection to move. Orange rings identify captures. Role labels can be toggled. Zoom, fit and fullscreen help on smaller displays. The seat list shows who controls each army and how many active pieces remain. The campaign journal records moves, Han activation, alliances and inherited armies.')
add('Local matches save automatically on this device. Resume from setup. Undo returns to the saved position before your latest human action; in a bot game it also rolls back the intervening bot replies. Resign and agreed draw have explicit confirmation controls. Download the journal as JSON for reviewing a completed match. The original Y-board table and online rooms remain accessible through the separate legacy link.')
sub('Load the timed English SRT')
add('Use <b>Sanguo-Yan-Yi-Qi-Free-Play-English.srt</b> with the exact 36:52 tutorial audio/video version. In VLC or another local player, add it through the subtitle-file menu. For automatic loading, put it next to the video and give both files the same base filename. Start subtitle synchronization at <b>0.000 seconds</b>; the cue times are measured from the beginning of the supplied audio, including its initial silence.')
add('The SRT is UTF-8, with sequential cue numbers, valid SubRip timestamps, no overlapping cues and no Chinese text. The complete transcript below uses the same cue IDs, wording and start/end times. Proper names or brief phrases that could not be verified are explicitly marked unclear. The file preserves those gaps rather than guessing the creator\'s name or a tactical statement.')
sub('Tutorial time map')
story.append(table([['Time','Content'],['00:03–03:19','Introduction, board, Han reserve, cities and board editions'],['03:22–09:34','Moves, Soldier boundaries, Cannon opening and neutral screens'],['09:40–15:39','Turn priority, alliance, regicide and proposed Han balance'],['15:46–22:20','Inheritance, wins/draws, ally protection and perpetual check'],['22:40–26:16','Missing-corner routes and resignation'],['26:28–32:15','Coordinates, identical-piece notation and historical years'],['32:21–36:48','Tactical examples, Han defence and closing remarks']],[94,CW-94]))

story += [NextPageTemplate('transcript'), PageBreak()]
add('APPENDIX / ALL 588 CUES','tag');add('Complete English<br/>timed transcript','h1')
add('Same wording and timing as the SRT. Cue ranges are hours:minutes:seconds,milliseconds. The transcript is preserved in spoken order, including examples, corrections, historical asides and marked uncertainties.','small')
srt=(ASSETS/'Sanguo-Yan-Yi-Qi-Free-Play-English.srt').read_text(encoding='utf-8')
blocks=[b for b in re.split(r'\n\s*\n',srt.strip()) if b]
assert len(blocks)==588
for i,b in enumerate(blocks,1):
    lines=b.splitlines();assert int(lines[0])==i
    start,end=lines[1].split(' --> ');text=' '.join(lines[2:])
    cue=P(f'<font name="Bold" color="#a77932">{i:03d}</font> <font size="6.7" color="#49616d">{start} - {end}</font><br/>{html.escape(text)}','cue')
    story.append(KeepTogether([cue]))
doc.build(story)
print(json.dumps({'output':str(args.output),'cues':len(blocks),'bytes':args.output.stat().st_size}))
