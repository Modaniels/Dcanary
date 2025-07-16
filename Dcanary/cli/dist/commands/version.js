"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVersionCommand = createVersionCommand;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ui_1 = require("../utils/ui");
function createVersionCommand() {
    const command = new commander_1.Command('version');
    command
        .description('Show version information')
        .action(() => {
        try {
            // Get package.json from the CLI directory
            const packageJsonPath = path.join(__dirname, '../../package.json');
            let version = '1.0.0';
            let name = 'mody-cli';
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                version = packageJson.version || version;
                name = packageJson.name || name;
            }
            console.log();
            console.log(ui_1.Colors.bold(ui_1.Colors.cyan('Mody CLI Version Information')));
            console.log(ui_1.Colors.gray('═'.repeat(40)));
            (0, ui_1.printKeyValue)('CLI Name', name);
            (0, ui_1.printKeyValue)('Version', version);
            (0, ui_1.printKeyValue)('Description', 'Decentralized Build Verification CLI for ICP');
            (0, ui_1.printKeyValue)('Node.js', process.version);
            (0, ui_1.printKeyValue)('Platform', `${process.platform} ${process.arch}`);
            console.log();
            console.log(ui_1.Colors.gray('For more information, visit:'));
            console.log(ui_1.Colors.gray('  https://github.com/your-org/mody-cli'));
            console.log();
        }
        catch (error) {
            console.log();
            console.log(ui_1.Colors.bold(ui_1.Colors.cyan('Mody CLI')));
            console.log(ui_1.Colors.gray('Version: 1.0.0'));
            console.log(ui_1.Colors.gray('Description: Decentralized Build Verification CLI for ICP'));
            console.log();
        }
    });
    return command;
}
//# sourceMappingURL=version.js.map