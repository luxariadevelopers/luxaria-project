import { useState } from 'react';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { evidenceSummary } from './labels';
import { CategoryStatusChip } from './CategoryStatusChip';
import type { ExpenseCategoryTreeNode } from './types';

type Props = {
  nodes: readonly ExpenseCategoryTreeNode[];
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
};

function CategoryTreeNodeRow({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: ExpenseCategoryTreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(depth < 2);

  return (
    <>
      <ListItemButton
        selected={selectedId === node.id}
        onClick={() => onSelect(node.id)}
        sx={{ pl: 1.5 + depth * 2 }}
        data-testid={`expense-category-tree-node-${node.categoryCode}`}
      >
        {hasChildren ? (
          <IconButton
            size="small"
            edge="start"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            sx={{ mr: 0.5 }}
          >
            {open ? (
              <ExpandLessIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </IconButton>
        ) : (
          <Box sx={{ width: 34, mr: 0.5 }} />
        )}
        <ListItemText
          primary={
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ alignItems: 'center', flexWrap: 'wrap' }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {node.categoryCode}
              </Typography>
              <Typography variant="body2">{node.name}</Typography>
              {node.isSystem ? (
                <Chip size="small" label="System" variant="outlined" />
              ) : null}
            </Stack>
          }
          secondary={
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ mt: 0.25, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <Typography variant="caption" color="text.secondary">
                Evidence: {evidenceSummary(node)}
              </Typography>
              <CategoryStatusChip status={node.status} />
            </Stack>
          }
          slotProps={{
            secondary: { component: 'div' },
          }}
        />
      </ListItemButton>
      {hasChildren ? (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List disablePadding>
            {node.children.map((child) => (
              <CategoryTreeNodeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </List>
        </Collapse>
      ) : null}
    </>
  );
}

export function CategoryTree({ nodes, selectedId, onSelect }: Props) {
  return (
    <List
      dense
      disablePadding
      data-testid="expense-category-tree"
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        maxHeight: { xs: 420, md: 'min(70vh, 720px)' },
        overflow: 'auto',
      }}
    >
      {nodes.map((node) => (
        <CategoryTreeNodeRow
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </List>
  );
}
