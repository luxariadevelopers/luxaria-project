import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
} from '@mui/material';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Luxaria ErrorBoundary', error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' });
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
              {this.state.message}
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
