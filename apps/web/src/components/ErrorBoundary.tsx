import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Global render-error boundary. Shows a safe generic message only —
 * never stack traces or tokens from the thrown value.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log full detail for developers; UI stays generic.
    console.error('Luxaria ErrorBoundary', error, info);
  }


  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'background.default',
            px: 2,
          }}
        >
          <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              Something went wrong
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              An unexpected error occurred. You can return to the dashboard and
              try again.
            </Typography>
            <Button variant="contained" onClick={this.handleReset}>
              Return to dashboard
            </Button>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}
