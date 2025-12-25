# Yazi Quick Reference

## Flags

| Flag | Description |
|------|-------------|
| `--cwd-file <file>` | Write cwd on exit |
| `--chooser-file <file>` | Write selected files on open |
| `--clear-cache` | Clear cache directory |
| `--debug` | Print debug info |

## Quick Launch

[Current Directory](tabz:spawn?cmd=yazi&name=Yazi)

[With CWD Sync](tabz:paste?text=yazi%20--cwd-file%20/tmp/yazi-cwd)

## Key Bindings

### Navigation
| Key | Action |
|-----|--------|
| `h/l` | Parent/enter directory |
| `j/k` | Down/up |
| `J/K` | Page down/up |
| `gg/G` | First/last |
| `~` | Home directory |
| `-` | Previous directory |
| `z` | Jump (fzf) |
| `Z` | Jump (zoxide) |

### Selection
| Key | Action |
|-----|--------|
| `Space` | Toggle selection |
| `v` | Visual mode |
| `V` | Visual mode (unset) |
| `Ctrl+a` | Select all |
| `Ctrl+r` | Inverse selection |
| `Esc` | Cancel selection |

### File Operations
| Key | Action |
|-----|--------|
| `o` | Open file |
| `O` | Open interactively |
| `Enter` | Open file |
| `y` | Yank (copy) |
| `x` | Cut |
| `p` | Paste |
| `P` | Paste (overwrite) |
| `d` | Trash |
| `D` | Permanently delete |
| `a` | Create file/dir |
| `r` | Rename |
| `.` | Toggle hidden |

### Tabs
| Key | Action |
|-----|--------|
| `t` | New tab |
| `1-9` | Switch to tab |
| `[/]` | Previous/next tab |
| `{/}` | Swap tab left/right |

### Search & Filter
| Key | Action |
|-----|--------|
| `/` | Search (forward) |
| `?` | Search (backward) |
| `n/N` | Next/previous match |
| `f` | Filter |
| `s` | Search files (fd) |
| `S` | Search content (rg) |

### View
| Key | Action |
|-----|--------|
| `w` | Toggle preview |
| `Tab` | Switch pane focus |
| `;` | Run shell command |
| `:` | Run shell (block) |

### Tasks
| Key | Action |
|-----|--------|
| `W` | Show tasks |
| `x` | Cancel task |

## Shell Integration

```bash
# CD to yazi's cwd on exit
function yy() {
  local tmp="$(mktemp -t "yazi-cwd.XXXXXX")"
  yazi "$@" --cwd-file="$tmp"
  if cwd="$(cat -- "$tmp")" && [ -n "$cwd" ] && [ "$cwd" != "$PWD" ]; then
    cd -- "$cwd"
  fi
  rm -f -- "$tmp"
}
```

## Config Location

```
~/.config/yazi/yazi.toml
~/.config/yazi/keymap.toml
~/.config/yazi/theme.toml
```
