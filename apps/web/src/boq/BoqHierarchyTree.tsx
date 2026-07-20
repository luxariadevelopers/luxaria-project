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
import { formatInr, formatQuantity } from '@/format';
import { boqItemStatusLabel, boqUnitLabel } from './labels';
import type {
  BoqHierarchyBlock,
  BoqHierarchyCategory,
  BoqHierarchyFloor,
  BoqTreeSelection,
  PublicBoqItem,
} from './types';

type Props = {
  blocks: readonly BoqHierarchyBlock[];
  selected: BoqTreeSelection;
  onSelect: (selection: BoqTreeSelection) => void;
};

function NodeToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <IconButton
      size="small"
      edge="start"
      aria-label={open ? 'Collapse' : 'Expand'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      sx={{ mr: 0.5 }}
    >
      {open ? (
        <ExpandLessIcon fontSize="small" />
      ) : (
        <ExpandMoreIcon fontSize="small" />
      )}
    </IconButton>
  );
}

function ItemRow({
  item,
  depth,
  selected,
  onSelect,
}: {
  item: PublicBoqItem;
  depth: number;
  selected: BoqTreeSelection;
  onSelect: (selection: BoqTreeSelection) => void;
}) {
  const isSelected = selected?.kind === 'item' && selected.id === item.id;
  return (
    <ListItemButton
      selected={isSelected}
      onClick={() => onSelect({ kind: 'item', id: item.id })}
      sx={{ pl: 1.5 + depth * 2 }}
      data-testid={`boq-tree-item-${item.boqCode}`}
    >
      <Box sx={{ width: 34, mr: 0.5 }} />
      <ListItemText
        primary={
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {item.boqCode}
            </Typography>
            <Typography variant="body2">{item.description}</Typography>
            <Chip size="small" label={boqItemStatusLabel(item.status)} />
          </Stack>
        }
        secondary={
          <Typography variant="caption" color="text.secondary">
            {formatQuantity(item.plannedQuantity)} {boqUnitLabel(item.unit)} ·{' '}
            {formatInr(item.plannedValue)}
          </Typography>
        }
      />
    </ListItemButton>
  );
}

function CategoryNode({
  category,
  depth,
  selected,
  onSelect,
}: {
  category: BoqHierarchyCategory;
  depth: number;
  selected: BoqTreeSelection;
  onSelect: (selection: BoqTreeSelection) => void;
}) {
  const [open, setOpen] = useState(true);
  const isSelected =
    selected?.kind === 'category' && selected.id === category.id;

  return (
    <>
      <ListItemButton
        selected={isSelected}
        onClick={() => onSelect({ kind: 'category', id: category.id })}
        sx={{ pl: 1.5 + depth * 2 }}
        data-testid={`boq-tree-category-${category.categoryCode}`}
      >
        <NodeToggle open={open} onToggle={() => setOpen((v) => !v)} />
        <ListItemText
          primary={
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {category.categoryCode} · {category.name}
            </Typography>
          }
          secondary={`${category.items.length} item(s)`}
        />
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {category.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </List>
      </Collapse>
    </>
  );
}

function FloorNode({
  floor,
  depth,
  selected,
  onSelect,
}: {
  floor: BoqHierarchyFloor;
  depth: number;
  selected: BoqTreeSelection;
  onSelect: (selection: BoqTreeSelection) => void;
}) {
  const [open, setOpen] = useState(true);
  const isSelected = selected?.kind === 'floor' && selected.id === floor.id;

  return (
    <>
      <ListItemButton
        selected={isSelected}
        onClick={() => onSelect({ kind: 'floor', id: floor.id })}
        sx={{ pl: 1.5 + depth * 2 }}
        data-testid={`boq-tree-floor-${floor.floorCode}`}
      >
        <NodeToggle open={open} onToggle={() => setOpen((v) => !v)} />
        <ListItemText
          primary={
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {floor.floorCode} · {floor.name}
            </Typography>
          }
          secondary={`Level ${floor.level}`}
        />
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {floor.workCategories.map((cat) => (
            <CategoryNode
              key={cat.id}
              category={cat}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </List>
      </Collapse>
    </>
  );
}

function BlockNode({
  block,
  selected,
  onSelect,
}: {
  block: BoqHierarchyBlock;
  selected: BoqTreeSelection;
  onSelect: (selection: BoqTreeSelection) => void;
}) {
  const [open, setOpen] = useState(true);
  const isSelected = selected?.kind === 'block' && selected.id === block.id;

  return (
    <>
      <ListItemButton
        selected={isSelected}
        onClick={() => onSelect({ kind: 'block', id: block.id })}
        sx={{ pl: 1.5 }}
        data-testid={`boq-tree-block-${block.blockCode}`}
      >
        <NodeToggle open={open} onToggle={() => setOpen((v) => !v)} />
        <ListItemText
          primary={
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {block.blockCode} · {block.name}
            </Typography>
          }
          secondary={`${block.floors.length} floor(s)`}
        />
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {block.floors.map((floor) => (
            <FloorNode
              key={floor.id}
              floor={floor}
              depth={1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </List>
      </Collapse>
    </>
  );
}

export function BoqHierarchyTree({ blocks, selected, onSelect }: Props) {
  if (blocks.length === 0) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ p: 2 }}
        data-testid="boq-tree-empty"
      >
        No BOQ hierarchy matches the current filters.
      </Typography>
    );
  }

  return (
    <List
      dense
      disablePadding
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        maxHeight: 560,
        overflow: 'auto',
      }}
      data-testid="boq-hierarchy-tree"
    >
      {blocks.map((block) => (
        <BlockNode
          key={block.id}
          block={block}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </List>
  );
}
