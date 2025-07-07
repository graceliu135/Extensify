// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Set some variables for the stats
let totalChars = 0;
let saves = 0;
let linesAdded = 0;
let linesDeleted = 0;
let editedFiles = new Set<string>();
const fileTypeCounts = new Map<string, number>();
let statusBarItem: vscode.StatusBarItem;
const statsCycle: (() => string)[] = [];
let cycleIndex = 0;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Stats Tracker is now active.');

	// Create a status bar item to display the stats
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.show();

    // Track edits
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            editedFiles.add(event.document.uri.toString());
            const text = event.document.getText();
            totalChars = text.length;

            const lines = text.split('\n');
            const totalLineLength = lines.reduce((sum, line) => sum + line.length, 0);
            const avgLineLength = (lines.length > 0) ? (totalLineLength / lines.length).toFixed(1) : '0';

			// Count file types
			const ext = event.document.uri.path.split('.').pop() || 'unknown';
			fileTypeCounts.set(ext, (fileTypeCounts.get(ext) || 0) + 1);

			// Lines added/deleted (per change)
            event.contentChanges.forEach(change => {
                const added = change.text.split('\n').length - 1;
                const removed = change.range.end.line - change.range.start.line;
                linesAdded += added;
                linesDeleted += removed;
            });

            updateStatsCycle(avgLineLength);
        })
    );

    // Track saves
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => {
            saves++;
        })
    );

    // Cycle the status bar every 3 seconds
    setInterval(() => {
        if (statsCycle.length === 0) return;
        statusBarItem.text = statsCycle[cycleIndex % statsCycle.length]();
        cycleIndex++;
    }, 3000);
}

// Find the most common file type
function getMostActiveFileType(): string {
    let maxCount = 0;
    let mostActive = 'none';
    for (const [ext, count] of fileTypeCounts) {
        if (count > maxCount) {
            maxCount = count;
            mostActive = ext;
        }
    }
    return mostActive;
}

// Update the status bar
function updateStatsCycle(avgLineLength: string) {
	statsCycle.length = 0;

    statsCycle.push(
        () => `$(pencil) Characters: ${totalChars}`,
        () => `$(list-ordered) Avg line: ${avgLineLength}`,
        () => `$(save) Saves: ${saves}`,
        () => `$(file) Files edited: ${editedFiles.size}`,
        () => `$(diff-added) Lines added: ${linesAdded}`,
        () => `$(diff-removed) Lines deleted: ${linesDeleted}`,
		() => `$(file-code) Most active file type: ${getMostActiveFileType()}`
    );
}

// This method is called when your extension is deactivated
export function deactivate() {
	statusBarItem.dispose();
	console.log('Stats Tracker is now deactivated.');
}
