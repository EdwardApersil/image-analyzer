import { runAnalysis } from "./index";
import {program} from 'commander'

program
    .name('react-image-analyzer')
    .description('Analyze React and image files for accessibility and quality')
    .version('1.0.1')
    .argument('[path]', 'Path to React project', './')
    .action((path) => {
        runAnalysis(path);
    });


program.parse(process.argv);