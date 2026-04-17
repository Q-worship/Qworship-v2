const fs = require('fs');
const file = 'apps/client/src/features/dashboard/components/DashboardMainWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = '<WebPageEditor';
const index = content.indexOf(targetStr);
if (index === -1) {
  console.log('Target not found');
  process.exit();
}

const endDivIdx = content.indexOf('</div>', index);
const firstPart = content.slice(0, endDivIdx + 6); // include </div>
const restPart = content.slice(endDivIdx + 6);

const toInsert = `

                        {/* Slide Canvas Editor */}
                        {editingContent.type === "media" && editingContent.subtype === "canvas" && (
                          <SlideCanvasEditor
                            editingContent={editingContent}
                            updateItemContent={updateItemContent}
                            setEditingContent={setEditingContent}
                          />
                        )}`;

fs.writeFileSync(file, firstPart + toInsert + restPart);
console.log('Replaced successfully');
