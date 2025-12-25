# btop Quick Reference

## Flags

| Flag | Description |
|------|-------------|
| `-p, --preset <0-9>` | Start with preset |
| `-u, --update <ms>` | Update rate in ms |
| `-lc, --low-color` | 256-color mode |
| `-t, --tty_on` | TTY mode (16 colors) |
| `+t, --tty_off` | Force TTY off |
| `--utf-force` | Force UTF-8 |
| `--debug` | Debug mode |

## Quick Launch

[Default](tabz:spawn?cmd=btop&name=btop)

[Fast Update (500ms)](tabz:spawn?cmd=btop%20-u%20500&name=btop%20Fast)

[Low Color Mode](tabz:spawn?cmd=btop%20-lc&name=btop%20256c)

[Preset 1](tabz:spawn?cmd=btop%20-p%201&name=btop%20P1)

## Key Bindings

### General
| Key | Action |
|-----|--------|
| `Esc` | Menu / Back / Cancel |
| `q` | Quit |
| `m` | Menu |
| `h` | Help |
| `1-4` | Preset layouts |

### Navigation
| Key | Action |
|-----|--------|
| `Up/Down` | Select process |
| `Left/Right` | Change column |
| `Enter` | Process menu |
| `Tab` | Cycle panels |

### Process Control
| Key | Action |
|-----|--------|
| `f` | Filter processes |
| `s` | Sort by column |
| `r` | Reverse sort |
| `t` | Tree view toggle |
| `k` | Kill process |
| `i` | Invert filter |
| `c` | Clear filter |

### View
| Key | Action |
|-----|--------|
| `+/-` | Expand/collapse |
| `e` | Toggle per-core |
| `g` | Toggle GPU |
| `n` | Toggle net sync |
| `b` | Toggle battery |

### Options
| Key | Action |
|-----|--------|
| `o` | Options menu |
| `p` | Change preset |

## Presets

| Preset | Description |
|--------|-------------|
| 0 | Default |
| 1 | Minimal (CPU focus) |
| 2 | Network focus |
| 3 | Process focus |
| 4-9 | Custom |

## Config Location

```
~/.config/btop/btop.conf
~/.config/btop/themes/
```
