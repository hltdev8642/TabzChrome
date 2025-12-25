# LazyGit Quick Reference

## Flags

| Flag | Description |
|------|-------------|
| `-p, --path` | Git repo path |
| `-f, --filter` | Filter commits by path |
| `-d, --debug` | Debug mode with logging |
| `-w, --work-tree` | Set work tree |
| `-g, --git-dir` | Set git directory |

## Quick Launch

[Current Directory](tabz:spawn?cmd=lazygit&name=LazyGit)

[Filter by Path](tabz:paste?text=lazygit%20-f%20src/)

[Debug Mode](tabz:spawn?cmd=lazygit%20-d&name=LazyGit%20Debug)

## Key Bindings

### Global
| Key | Action |
|-----|--------|
| `?` | Help |
| `q` | Quit / Back |
| `Esc` | Cancel |
| `@` | Command log |
| `+` | Next layout |
| `-` | Previous layout |

### Files Panel
| Key | Action |
|-----|--------|
| `Space` | Stage/unstage |
| `a` | Stage all |
| `c` | Commit |
| `A` | Amend last commit |
| `d` | Discard changes |
| `e` | Edit file |
| `o` | Open file |
| `i` | Add to .gitignore |
| `S` | Stash options |

### Commits Panel
| Key | Action |
|-----|--------|
| `c` | Cherry-pick |
| `g` | Reset options |
| `r` | Reword commit |
| `R` | Rebase options |
| `s` | Squash down |
| `f` | Fixup |
| `d` | Drop commit |
| `t` | Tag commit |
| `y` | Copy commit hash |

### Branches Panel
| Key | Action |
|-----|--------|
| `Space` | Checkout |
| `n` | New branch |
| `d` | Delete |
| `M` | Merge into current |
| `r` | Rebase onto current |
| `R` | Rename |
| `u` | Set upstream |

### Stash Panel
| Key | Action |
|-----|--------|
| `Space` | Apply |
| `g` | Pop |
| `d` | Drop |
| `n` | New stash |

### Navigation
| Key | Action |
|-----|--------|
| `h/l` | Previous/next panel |
| `j/k` | Down/up |
| `H/L` | Scroll left/right |
| `PgUp/PgDn` | Page up/down |
| `</>` | Scroll diff |
| `/` | Search |

## Config Location

```
~/.config/lazygit/config.yml
```

## Print Default Config

```bash
lazygit -c
```

[Print Config](tabz:paste?text=lazygit%20-c)
