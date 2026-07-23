import { createTheme } from '@mui/material/styles';

export const luxariaTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1B3A4B',
      contrastText: '#F7F4EF',
    },
    secondary: {
      main: '#C4A35A',
    },
    background: {
      default: '#F3F0EA',
      paper: '#FFFcf7',
    },
    text: {
      primary: '#1A1F24',
      secondary: '#5A6570',
    },
  },
  typography: {
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h2: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h3: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h4: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h5: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h6: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiModal: {
      defaultProps: {
        disableRestoreFocus: true,
      },
    },
    MuiDialog: {
      defaultProps: {
        disableRestoreFocus: true,
      },
    },
  },
});
