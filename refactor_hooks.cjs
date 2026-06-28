const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, 'src', 'hooks');
const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(hooksDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Add useAuth import if missing
    if (!content.includes('useAuth')) {
        content = content.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect } from "react";\nimport { useAuth } from "../contexts/AuthContext";');
    }

    // Insert useAuth inside the hook function
    const hookName = file.replace('.js', '');
    const hookRegex = new RegExp(`export function ${hookName}\\(\\) {`);
    
    if (content.match(hookRegex) && !content.includes('const farmId')) {
        content = content.replace(hookRegex, `export function ${hookName}() {\n    const { userData } = useAuth();\n    const farmId = userData?.farmId;`);
    }

    // Wrap useEffect logic
    // Add if (!farmId) return; inside useEffect
    content = content.replace(/useEffect\(\(\) => {/g, 'useEffect(() => {\n        if (!farmId) return;');

    // Update useEffect dependency array
    content = content.replace(/}, \[\]\);/g, '}, [farmId]);');

    // Update RTDB references
    // ref(rtdb, 'cattle') -> ref(rtdb, `farms/${farmId}/cattle`)
    content = content.replace(/ref\(rtdb, '([^']+)'\)/g, 'ref(rtdb, `farms/${farmId}/$1`)');
    
    // ref(rtdb, `cattle/${id}`) -> ref(rtdb, `farms/${farmId}/cattle/${id}`)
    // We need to carefully replace backticks.
    // e.g., ref(rtdb, `cattle/${id}`) -> ref(rtdb, `farms/${farmId}/cattle/${id}`)
    // This regex looks for ref(rtdb, `SOMETHING`) and inserts farms/${farmId}/
    content = content.replace(/ref\(rtdb, \`([^`]+)\`\)/g, (match, p1) => {
        // If it already has farms/, don't replace
        if (p1.startsWith('farms/')) return match;
        return `ref(rtdb, \`farms/\${farmId}/${p1}\`)`;
    });

    fs.writeFileSync(filePath, content);
    console.log(`Refactored ${file}`);
});
