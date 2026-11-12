ALTER TABLE organizer_layout_template
    ADD COLUMN icon VARCHAR(20) NULL,
    ADD CONSTRAINT chk_layout_template_icon CHECK (
        icon IS NULL OR icon IN ('TABLE','PLANT','PARTITION','BOX','LOCKER','SOFA','SHELF','PRINTER','SCREEN','COFFEE','WHITEBOARD','LAMP')
    );
