var cpgThemePhoca =
{
	prefix:	'ThemePhoca',
  	// main menu display attributes
  	//
  	// Note.  When the menu bar is horizontal,
  	// mainFolderLeft and mainFolderRight are
  	// put in <span></span>.  When the menu
  	// bar is vertical, they would be put in
  	// a separate TD cell.

  	// HTML code to the left of the folder item
  	mainFolderLeft: '&nbsp;',
  	// HTML code to the right of the folder item
  	mainFolderRight: '<img alt="" src="' + cpgThemePhocaBase + 'folderopen.gif">', 
	// HTML code to the left of the regular item
	mainItemLeft:  '&nbsp;',
	// HTML code to the right of the regular item
	mainItemRight: '<img alt="" src="' + cpgThemePhocaBase + 'folder.gif">',

	// sub menu display attributes

	// HTML code to the left of the folder item
	folderLeft: '<img alt="" src="' + cpgThemePhocaBase + 'arrowLeft.gif">',
	// HTML code to the right of the folder item
	folderRight: '<img alt="" src="' + cpgThemePhocaBase + 'folderopen.gif">',
	// HTML code to the left of the regular item
	itemLeft: '<img alt="" src="' + cpgThemePhocaBase + 'spacer.gif">',
	// HTML code to the right of the regular item
	itemRight: '<img alt="" src="' + cpgThemePhocaBase + 'folder.gif">',
	// cell spacing for main menu
	mainSpacing: 0,
	// cell spacing for sub menus
	subSpacing: 0,
	// auto dispear time for submenus in milli-seconds
	delay: 200,

	// move 1st lvl submenu for horizontal menus up a bit to avoid double border
	offsetHMainAdjust:	[0, -1],
	offsetVMainAdjust:	[-1, 0],
	// offset according to Opera, which is correct.
	offsetSubAdjust:	[1, 0]
	// rest use default settings
};

// for sub menu horizontal split
var cpgThemePhocaHSplit = [_cpgNoClick, '<td colspan="2" class="ThemePhocaMenuSplit"><div class="ThemePhocaMenuSplit"></div></td>'];
// for vertical main menu horizontal split
var cpgThemePhocaMainHSplit = [_cpgNoClick, '<td colspan="2" class="ThemePhocaMenuSplit"><div class="ThemePhocaMenuSplit"></div></td>'];
// for horizontal main menu vertical split
var cpgThemePhocaMainVSplit = [_cpgNoClick, '|'];
