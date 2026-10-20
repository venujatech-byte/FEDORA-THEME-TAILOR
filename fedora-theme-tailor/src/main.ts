import './styles/main.css';
import { ThemeEngine } from './lib/theme-engine';
import { UIController } from './lib/ui-controller';

const themeEngine = new ThemeEngine();
const ui = new UIController(themeEngine);

await ui.initialize();
await themeEngine.loadCurrentTheme();

ui.render();