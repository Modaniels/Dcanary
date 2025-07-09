import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { Colors, printKeyValue } from '../utils/ui';

export function createVersionCommand(): Command {
    const command = new Command('version');

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
                console.log(Colors.bold(Colors.cyan('Mody CLI Version Information')));
                console.log(Colors.gray('═'.repeat(40)));
                
                printKeyValue('CLI Name', name);
                printKeyValue('Version', version);
                printKeyValue('Description', 'Decentralized Build Verification CLI for ICP');
                printKeyValue('Node.js', process.version);
                printKeyValue('Platform', `${process.platform} ${process.arch}`);
                
                console.log();
                console.log(Colors.gray('For more information, visit:'));
                console.log(Colors.gray('  https://github.com/your-org/mody-cli'));
                console.log();

            } catch (error: any) {
                console.log();
                console.log(Colors.bold(Colors.cyan('Mody CLI')));
                console.log(Colors.gray('Version: 1.0.0'));
                console.log(Colors.gray('Description: Decentralized Build Verification CLI for ICP'));
                console.log();
            }
        });

    return command;
}
