# Security

Boletas is a static browser app. Billing workbooks are parsed locally in the
operator's browser and are not uploaded to an application server.

Only load trusted internal workbooks. The current spreadsheet parser is
`xlsx`, and npm audit reports unresolved SheetJS parser advisories with no
available npm fix for the package line currently used here. Replacing or
sandboxing spreadsheet parsing is the top security-maintenance item for this
project.

Please report suspected vulnerabilities through GitHub Issues or by contacting
the repository maintainer directly.
