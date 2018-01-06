# REMOTE Command - Node Version Switcher

    nvs proxy
    nvs proxy get
    nvs proxy show

    nvs proxy <value>

    nvs proxy set <value>
    nvs proxy add <value>

    nvs proxy -d <value>
    nvs proxy rm <value>

Queries, sets, or removes proxy for downloading node. When no arguments are specified, current value is shown. When just a value is specified, the proxy is set to that value. The `-d` or `rm` command removes an item.

The settings are persisted in `$NVS_HOME/settings.json`.
