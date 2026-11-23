---
description: Render Mermaid diagram from .mmd file and open in viewer
agent: build
---

Render the Mermaid diagram from the file $ARGUMENTS using mmdc (mermaid-cli).

Steps:
1. Check if the file $ARGUMENTS exists
2. Run: mmdc -i $ARGUMENTS -o (change extension to .png)
3. Open the generated PNG file with Start-Process
4. Report success or failure

If no argument is provided, ask the user for the .mmd file path.
