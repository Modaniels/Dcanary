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
exports.createAddInstructionsCommand = createAddInstructionsCommand;
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const types_1 = require("../types");
const canister_1 = require("../services/canister");
const config_1 = require("../utils/config");
const helpers_1 = require("../utils/helpers");
const ui_1 = require("../utils/ui");
const logger_1 = require("../utils/logger");
function createAddInstructionsCommand() {
    const command = new commander_1.Command('add-instructions');
    command
        .description('Add or update build instructions for a project')
        .requiredOption('-p, --project-id <project_id>', 'Project ID')
        .requiredOption('-v, --version <version>', 'Project version')
        .option('-i, --instruction-set <instruction_set>', 'Build instructions as a string')
        .option('-f, --file <file_path>', 'Path to file containing build instructions')
        .option('-c, --canister-id <canister_id>', 'Build instructions canister ID')
        .option('-n, --network <network>', 'Network to use (ic or local)', 'local')
        .option('--identity <identity>', 'Identity to use')
        .action(async (options) => {
        const spinner = new ui_1.Spinner();
        try {
            // Validate inputs
            validateInputs(options);
            // Get configuration
            const config = config_1.configManager.getConfig();
            const canisterId = options.canisterId || config.buildInstructionsCanisterId;
            const network = options.network || config.network || 'local';
            if (!canisterId) {
                throw new types_1.ValidationError('Build instructions canister ID is required. ' +
                    'Use --canister-id option or configure it with: mody configure --set-build-canister-id <ID>');
            }
            // Get instruction set
            const instructionSet = getInstructionSet(options);
            // Initialize canister service
            const networkUrl = network === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943';
            const canisterService = new canister_1.CanisterService(networkUrl);
            // Add build instructions
            spinner.start(`Adding build instructions for ${ui_1.Colors.cyan(options.projectId)}@${ui_1.Colors.cyan(options.version)}`);
            await canisterService.addBuildInstructions(canisterId, options.projectId, options.version, instructionSet);
            spinner.succeed(`Build instructions added successfully for ${ui_1.Colors.cyan(options.projectId)}@${ui_1.Colors.cyan(options.version)}`);
            // Display summary
            console.log();
            console.log(ui_1.Colors.bold('Summary:'));
            console.log(`  Project ID: ${ui_1.Colors.cyan(options.projectId)}`);
            console.log(`  Version: ${ui_1.Colors.cyan(options.version)}`);
            console.log(`  Canister ID: ${ui_1.Colors.gray(canisterId)}`);
            console.log(`  Network: ${ui_1.Colors.gray(network)}`);
            console.log(`  Instructions length: ${ui_1.Colors.gray(instructionSet.length.toString())} characters`);
            if (options.file) {
                console.log(`  Source file: ${ui_1.Colors.gray(options.file)}`);
            }
            logger_1.logger.info('Build instructions added', {
                projectId: options.projectId,
                version: options.version,
                canisterId,
                network,
                instructionsLength: instructionSet.length
            });
        }
        catch (error) {
            spinner.fail();
            if (error instanceof types_1.ValidationError) {
                (0, ui_1.printError)('Validation Error', error.message);
                process.exit(1);
            }
            else if (error?.name === 'CanisterError' || error?.name === 'NetworkError') {
                (0, ui_1.printError)(error.name, error.message);
                process.exit(1);
            }
            else {
                const errorMessage = error?.message || 'Unknown error occurred';
                (0, ui_1.printError)('Unexpected Error', errorMessage);
                logger_1.logger.error('Unexpected error in add-instructions command', { error: errorMessage });
                process.exit(1);
            }
        }
    });
    return command;
}
function validateInputs(options) {
    if (!options.projectId) {
        throw new types_1.ValidationError('Project ID is required');
    }
    if (!options.version) {
        throw new types_1.ValidationError('Version is required');
    }
    if (!options.instructionSet && !options.file) {
        throw new types_1.ValidationError('Either --instruction-set or --file must be provided');
    }
    if (options.instructionSet && options.file) {
        throw new types_1.ValidationError('Cannot specify both --instruction-set and --file');
    }
    (0, helpers_1.validateProjectId)(options.projectId);
    (0, helpers_1.validateVersion)(options.version);
    if (options.canisterId) {
        (0, helpers_1.validateCanisterId)(options.canisterId);
    }
    if (options.file && !fs.existsSync(options.file)) {
        throw new types_1.ValidationError(`File not found: ${options.file}`);
    }
    if (options.network && !['ic', 'local'].includes(options.network)) {
        throw new types_1.ValidationError('Network must be either "ic" or "local"');
    }
}
function getInstructionSet(options) {
    if (options.instructionSet) {
        return options.instructionSet.trim();
    }
    if (options.file) {
        try {
            const content = fs.readFileSync(options.file, 'utf8');
            if (!content.trim()) {
                throw new types_1.ValidationError('Build instructions file is empty');
            }
            return content.trim();
        }
        catch (error) {
            if (error instanceof types_1.ValidationError) {
                throw error;
            }
            const errorMessage = error?.message || 'Unknown error occurred';
            throw new types_1.ValidationError(`Failed to read file ${options.file}: ${errorMessage}`);
        }
    }
    throw new types_1.ValidationError('No instruction set provided');
}
//# sourceMappingURL=add-instructions.js.map