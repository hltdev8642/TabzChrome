# lnav Quick Reference

## Flags

| Flag | Description |
|------|-------------|
| `-r` | Recursive directory loading |
| `-R` | Include rotated logs |
| `-t` | Prepend timestamps to stdin |
| `-n` | Headless mode (no UI) |
| `-c <cmd>` | Execute command on load |
| `-f <file>` | Execute commands from file |
| `-N` | Don't open default syslog |

## Quick Launch

[System Logs](tabz:spawn?cmd=lnav&name=lnav)

[Recursive Directory](tabz:paste?text=lnav%20-r%20/var/log/)

[With Rotated Logs](tabz:paste?text=lnav%20-R%20/var/log/syslog)

[Headless Mode](tabz:paste?text=lnav%20-n%20-c%20%22;filter-out%20DEBUG%22)

## Key Bindings

### Navigation
| Key | Action |
|-----|--------|
| `j/k` | Down/up |
| `PgDn/PgUp` | Page down/up |
| `Home/End` | Start/end |
| `g/G` | Go to time/line |
| `e/E` | Next/prev error |
| `w/W` | Next/prev warning |
| `n/N` | Next/prev search |
| `f/F` | Next/prev file |
| `>/<` | Newer/older by 1 hr |

### Search & Filter
| Key | Action |
|-----|--------|
| `/` | Search forward |
| `?` | Search backward |
| `:` | Command mode |
| `;` | SQL mode |
| `|` | Pipe to script |

### Views
| Key | Action |
|-----|--------|
| `?` | Help |
| `q` | Quit / Back |
| `v` | Toggle views |
| `i` | Histogram view |
| `I` | Histogram zoom |
| `p` | Toggle pretty-print |
| `t` | Toggle timestamp |
| `T` | Text wrap |

### Marks & Bookmarks
| Key | Action |
|-----|--------|
| `m` | Toggle mark |
| `M` | Mark all visible |
| `J/K` | Next/prev mark |
| `c` | Copy marked lines |
| `C` | Clear marks |

### Filtering
| Key | Action |
|-----|--------|
| `Tab` | Toggle filter panel |
| `x` | Toggle filter |
| `D` | Delete filter |
| `o` | Toggle filtering |
| `z` | Zoom to selection |

## Useful Commands (`:`)

```
:filter-out DEBUG           # Hide DEBUG lines
:filter-in ERROR            # Show only ERROR
:hide-file <filename>       # Hide file
:open <file>                # Open file
:write-to <file>            # Write view to file
:goto <time>                # Jump to time
:comment <text>             # Add bookmark comment
```

## SQL Mode (`;`)

```sql
;SELECT * FROM syslog_log LIMIT 10
;SELECT count(*) FROM all_logs GROUP BY log_level
```

## Log Formats

```bash
# Install extra formats
lnav -i extra

# List formats
lnav -m format list
```

## Config Location

```
~/.config/lnav/
/etc/lnav/
```

## Pipe Usage

```bash
# Tail with timestamps
tail -f app.log | lnav -t

# Make output with timestamps
make 2>&1 | lnav -t
```

[Pipe Example](tabz:paste?text=tail%20-f%20/var/log/syslog%20|%20lnav)
