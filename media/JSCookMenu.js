/*
	JSCookMenu v2.0.3 (c) Copyright 2002-2006 by Heng Yuan

	http://jscook.sourceforge.net/JSCookMenu/

	Permission is hereby granted, free of charge, to any person obtaining a
	copy of this software and associated documentation files (the "Software"),
	to deal in the Software without restriction, including without limitation
	the rights to use, copy, modify, merge, publish, distribute, sublicense,
	and/or sell copies of the Software, and to permit persons to whom the
	Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included
	in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	ITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
	FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
	DEALINGS IN THE SOFTWARE.
*/

// default node properties
var _cpgNodeProperties =
{
	// theme prefix
	prefix:	'',

  	// main menu display attributes
  	//
  	// Note.  When the menu bar is horizontal,
  	// mainFolderLeft and mainFolderRight are
  	// put in <span></span>.  When the menu
  	// bar is vertical, they would be put in
  	// a separate TD cell.

  	// HTML code to the left of the folder item
  	mainFolderLeft: '',
  	// HTML code to the right of the folder item
  	mainFolderRight: '',
	// HTML code to the left of the regular item
	mainItemLeft: '',
	// HTML code to the right of the regular item
	mainItemRight:	'',

	// sub menu display attributes

	// HTML code to the left of the folder item
	folderLeft:		'',
	// HTML code to the right of the folder item
	folderRight:	'',
	// HTML code to the left of the regular item
	itemLeft:		'',
	// HTML code to the right of the regular item
	itemRight:		'',
	// cell spacing for main menu
	mainSpacing:	0,
	// cell spacing for sub menus
	subSpacing:		0,

	// optional settings
	// If not set, use the default

	// auto disappear time for submenus in milli-seconds
	delay:			500,

	// 1st layer sub menu starting index
	zIndexStart:	1000,
	// z-index incremental step for subsequent layers
	zIndexInc:		5,

	// sub menu header appears before the sub menu table
	subMenuHeader:	null,
	// sub menu header appears after the sub menu table
	subMenuFooter:	null,

	// submenu location adjustments
	//
	// offsetHMainAdjust for adjusting the first submenu
	// 		of a 'hbr' menu.
	// offsetVMainAdjust for adjusting the first submenu
	//		of a 'vbr' menu.
	// offsetSubAdjust for subsequent level of submenus
	//
	offsetHMainAdjust:	[0, 0],
	offsetVMainAdjust:	[0, 0],
	offsetSubAdjust:	[0, 0],

	// act on click to open sub menu
	// not yet implemented
	// 0 : use default behavior
	// 1 : hover open in all cases
	// 2 : click on main, hover on sub
	// 3 : click open in all cases (illegal as of 1.5)
	clickOpen:		1,

	// special effects on open/closing a sub menu
	effect:			null
};

// Globals
var _cpgIDCount = 0;
var _cpgIDName = 'cpgSubMenuPhocaGalleryID';		// for creating submenu id

var _cpgTimeOut = null;				// how long the menu would stay
var _cpgCurrentItem = null;			// the current menu item being selected;

var _cpgNoAction = new Object ();	// indicate that the item cannot be hovered.
var _cpgNoClick = new Object ();		// similar to _cpgNoAction but does not respond to mouseup/mousedown events
var _cpgSplit = new Object ();		// indicate that the item is a menu split

var _cpgMenuList = new Array ();		// a list of the current menus
var _cpgItemList = new Array ();		// a simple list of items

var _cpgFrameList = new Array ();	// a pool of reusable iframes
var _cpgFrameListSize = 0;			// keep track of the actual size
var _cpgFrameIDCount = 0;			// keep track of the frame id
var _cpgFrameMasking = true;			// use the frame masking

// disable iframe masking for IE7
/*@cc_on
	@if (@_jscript_version >= 5.6)
		if (_cpgFrameMasking)
		{
			var v = navigator.appVersion;
			var i = v.indexOf ("MSIE ");
			if (i >= 0)
			{
				if (parseInt (navigator.appVersion.substring (i + 5)) >= 7)
					_cpgFrameMasking = false;
			}
		}
	@end
@*/

var _cpgClicked = false;				// for onClick

// flag for turning on off hiding objects
//
// 0: automatic
// 1: hiding
// 2: no hiding
var _cpgHideObjects = 0;

// Utility function to do a shallow copy a node property
function cpgClone (nodeProperties)
{
	var returnVal = new Object ();
	for (v in nodeProperties)
		returnVal[v] = nodeProperties[v];
	return returnVal;
}

//
// store the new menu information into a structure to retrieve it later
//
function cpgAllocpgenu (id, menu, orient, nodeProperties, prefix)
{
	var info = new Object ();
	info.div = id;
	info.menu = menu;
	info.orient = orient;
	info.nodeProperties = nodeProperties;
	info.prefix = prefix;
	var menuID = _cpgMenuList.length;
	_cpgMenuList[menuID] = info;
	return menuID;
}

//
// request a frame
//
function cpgAllocFrame ()
{
	if (_cpgFrameListSize > 0)
		return cpgGetObject (_cpgFrameList[--_cpgFrameListSize]);
	var frameObj = document.createElement ('iframe');
	var id = _cpgFrameIDCount++;
	frameObj.id = 'cpgFrame' + id;
	frameObj.frameBorder = '0';
	frameObj.style.display = 'none';
	frameObj.src = 'javascript:false';
	document.body.appendChild (frameObj);
	frameObj.style.filter = 'alpha(opacity=0)';
	frameObj.style.zIndex = 99;
	frameObj.style.position = 'absolute';
	frameObj.style.border = '0';
	frameObj.scrolling = 'no';
	return frameObj;
}

//
// make a frame resuable later
//
function cpgFreeFrame (frameObj)
{
	_cpgFrameList[_cpgFrameListSize++] = frameObj.id;
}

//////////////////////////////////////////////////////////////////////
//
// Drawing Functions and Utility Functions
//
//////////////////////////////////////////////////////////////////////

//
// produce a new unique id
//
function cpgNewID ()
{
	return _cpgIDName + (++_cpgIDCount);
}

//
// return the property string for the menu item
//
function cpgActionItem (item, isMain, idSub, menuInfo, menuID)
{
	_cpgItemList[_cpgItemList.length] = item;
	var index = _cpgItemList.length - 1;
	idSub = (!idSub) ? 'null' : ('\'' + idSub + '\'');

	var clickOpen = menuInfo.nodeProperties.clickOpen;
	var onClick = (clickOpen == 3) || (clickOpen == 2 && isMain);

	var param = 'this,' + isMain + ',' + idSub + ',' + menuID + ',' + index;

	var returnStr;
	if (onClick)
		returnStr = ' onmouseover="cpgItemMouseOver(' + param + ',false)" onmousedown="cpgItemMouseDownOpenSub (' + param + ')"';
	else
		returnStr = ' onmouseover="cpgItemMouseOverOpenSub (' + param + ')" onmousedown="cpgItemMouseDown (' + param + ')"';
	return returnStr + ' onmouseout="cpgItemMouseOut (' + param + ')" onmouseup="cpgItemMouseUp (' + param + ')"';
}

//
// this one is used by _cpgNoClick to only take care of onmouseover and onmouseout
// events which are associated with menu but not actions associated with menu clicking/closing
//
function cpgNoClickItem (item, isMain, idSub, menuInfo, menuID)
{
	// var index = _cpgItemList.push (item) - 1;
	_cpgItemList[_cpgItemList.length] = item;
	var index = _cpgItemList.length - 1;
	idSub = (!idSub) ? 'null' : ('\'' + idSub + '\'');

	var param = 'this,' + isMain + ',' + idSub + ',' + menuID + ',' + index;

	return ' onmouseover="cpgItemMouseOver (' + param + ')" onmouseout="cpgItemMouseOut (' + param + ')"';
}

function cpgNoActionItem (item)
{
	return item[1];
}

function cpgSplitItem (prefix, isMain, vertical)
{
	var classStr = 'cpg' + prefix;
	if (isMain)
	{
		classStr += 'Main';
		if (vertical)
			classStr += 'HSplit';
		else
			classStr += 'VSplit';
	}
	else
		classStr += 'HSplit';
	return eval (classStr);
}

//
// draw the sub menu recursively
//
function cpgDrawSubMenu (subMenu, prefix, id, nodeProperties, zIndexStart, menuInfo, menuID)
{
	var str = '<div class="' + prefix + 'SubMenu" id="' + id + '" style="z-index: ' + zIndexStart + ';position: absolute; top: 0px; left: 0px;">';
	if (nodeProperties.subMenuHeader)
		str += nodeProperties.subMenuHeader;

	str += '<table summary="sub menu" id="' + id + 'Table" cellspacing="' + nodeProperties.subSpacing + '" class="' + prefix + 'SubMenuTable">';

	var strSub = '';

	var item;
	var idSub;
	var hasChild;

	var i;

	var classStr;

	for (i = 5; i < subMenu.length; ++i)
	{
		item = subMenu[i];
		if (!item)
			continue;

		if (item == _cpgSplit)
			item = cpgSplitItem (prefix, 0, true);
		item.parentItem = subMenu;
		item.subMenuID = id;

		hasChild = (item.length > 5);
		idSub = hasChild ? cpgNewID () : null;

		str += '<tr class="' + prefix + 'MenuItem"';
		if (item[0] != _cpgNoClick)
			str += cpgActionItem (item, 0, idSub, menuInfo, menuID);
		else
			str += cpgNoClickItem (item, 0, idSub, menuInfo, menuID);
		str += '>'

		if (item[0] == _cpgNoAction || item[0] == _cpgNoClick)
		{
			str += cpgNoActionItem (item);
			str += '</tr>';
			continue;
		}

		classStr = prefix + 'Menu';
		classStr += hasChild ? 'Folder' : 'Item';

		str += '<td class="' + classStr + 'Left">';

		if (item[0] != null)
			str += item[0];
		else
			str += hasChild ? nodeProperties.folderLeft : nodeProperties.itemLeft;

		str += '</td><td class="' + classStr + 'Text">' + item[1];

		str += '</td><td class="' + classStr + 'Right">';

		if (hasChild)
		{
			str += nodeProperties.folderRight;
			strSub += cpgDrawSubMenu (item, prefix, idSub, nodeProperties, zIndexStart + nodeProperties.zIndexInc, menuInfo, menuID);
		}
		else
			str += nodeProperties.itemRight;
		str += '</td></tr>';
	}

	str += '</table>';

	if (nodeProperties.subMenuFooter)
		str += nodeProperties.subMenuFooter;
	str += '</div>' + strSub;
	return str;
}

//
// The function that builds the menu inside the specified element id.
//
// id				id of the element
// orient			orientation of the menu in [hv][ub][lr] format
// menu				the menu object to be drawn
// nodeProperties	properties for the theme
// prefix			prefix of the theme
//
function cpgDraw (id, menu, orient, nodeProperties, prefix)
{
	var obj = cpgGetObject (id);

	if (!prefix)
		prefix = nodeProperties.prefix;
	if (!prefix)
		prefix = '';
	if (!nodeProperties)
		nodeProperties = _cpgNodeProperties;
	if (!orient)
		orient = 'hbr';

	var menuID = cpgAllocpgenu (id, menu, orient, nodeProperties, prefix);
	var menuInfo = _cpgMenuList[menuID];

	// setup potentially missing properties
	if (!nodeProperties.delay)
		nodeProperties.delay = _cpgNodeProperties.delay;
	if (!nodeProperties.clickOpen)
		nodeProperties.clickOpen = _cpgNodeProperties.clickOpen;
	if (!nodeProperties.zIndexStart)
		nodeProperties.zIndexStart = _cpgNodeProperties.zIndexStart;
	if (!nodeProperties.zIndexInc)
		nodeProperties.zIndexInc = _cpgNodeProperties.zIndexInc;
	if (!nodeProperties.offsetHMainAdjust)
		nodeProperties.offsetHMainAdjust = _cpgNodeProperties.offsetHMainAdjust;
	if (!nodeProperties.offsetVMainAdjust)
		nodeProperties.offsetVMainAdjust = _cpgNodeProperties.offsetVMainAdjust;
	if (!nodeProperties.offsetSubAdjust)
		nodeProperties.offsetSubAdjust = _cpgNodeProperties.offsetSubAdjust;
	// save user setting on frame masking
	menuInfo.cpgFrameMasking = _cpgFrameMasking;

	var str = '<table summary="main menu" class="' + prefix + 'Menu" cellspacing="' + nodeProperties.mainSpacing + '">';
	var strSub = '';

	var vertical;

	// draw the main menu items
	if (orient.charAt (0) == 'h')
	{
		str += '<tr>';
		vertical = false;
	}
	else
	{
		vertical = true;
	}

	var i;
	var item;
	var idSub;
	var hasChild;

	var classStr;

	for (i = 0; i < menu.length; ++i)
	{
		item = menu[i];

		if (!item)
			continue;

		item.menu = menu;
		item.subMenuID = id;

		str += vertical ? '<tr' : '<td';
		str += ' class="' + prefix + 'MainItem"';

		hasChild = (item.length > 5);
		idSub = hasChild ? cpgNewID () : null;

		str += cpgActionItem (item, 1, idSub, menuInfo, menuID) + '>';

		if (item == _cpgSplit)
			item = cpgSplitItem (prefix, 1, vertical);

		if (item[0] == _cpgNoAction || item[0] == _cpgNoClick)
		{
			str += cpgNoActionItem (item);
			str += vertical? '</tr>' : '</td>';
			continue;
		}

		classStr = prefix + 'Main' + (hasChild ? 'Folder' : 'Item');

		str += vertical ? '<td' : '<span';
		str += ' class="' + classStr + 'Left">';

		str += (item[0] == null) ? (hasChild ? nodeProperties.mainFolderLeft : nodeProperties.mainItemLeft)
					 : item[0];
		str += vertical ? '</td>' : '</span>';

		str += vertical ? '<td' : '<span';
		str += ' class="' + classStr + 'Text">';
		str += item[1];

		str += vertical ? '</td>' : '</span>';

		str += vertical ? '<td' : '<span';
		str += ' class="' + classStr + 'Right">';

		str += hasChild ? nodeProperties.mainFolderRight : nodeProperties.mainItemRight;

		str += vertical ? '</td>' : '</span>';

		str += vertical ? '</tr>' : '</td>';

		if (hasChild)
			strSub += cpgDrawSubMenu (item, prefix, idSub, nodeProperties, nodeProperties.zIndexStart, menuInfo, menuID);
	}
	if (!vertical)
		str += '</tr>';
	str += '</table>' + strSub;
	obj.innerHTML = str;
}

//
// The function builds the menu inside the specified element id.
//
// This function is similar to cpgDraw except that menu is taken from HTML node
// rather a javascript tree.  This feature allows links to be scanned by search
// bots.
//
// This function basically converts HTML node to a javascript tree, and then calls
// cpgDraw to draw the actual menu, replacing the hidden menu tree.
//
// Format:
//	<div id="menu">
//		<ul style="visibility: hidden">
//			<li><span>icon</span><a href="link" title="description">main menu text</a>
//				<ul>
//					<li><span>icon</span><a href="link" title="description">submenu item</a>
//					</li>
//				</ul>
//			</li>
//		</ul>
//	</div>
//
function cpgDrawFromText (id, orient, nodeProperties, prefix)
{
	var domMenu = cpgGetObject (id);
	var menu = null;
	for (var currentDomItem = domMenu.firstChild; currentDomItem; currentDomItem = currentDomItem.nextSibling)
	{
		if (!currentDomItem.tagName)
			continue;
		var tag = currentDomItem.tagName.toLowerCase ();
		if (tag != 'ul' && tag != 'ol')
			continue;
		menu = cpgDrawFromTextSubMenu (currentDomItem);
		break;
	}
	if (menu)
		cpgDraw (id, menu, orient, nodeProperties, prefix);
}

//
// a recursive function that build menu tree structure
//
function cpgDrawFromTextSubMenu (domMenu)
{
	var items = new Array ();
	for (var currentDomItem = domMenu.firstChild; currentDomItem; currentDomItem = currentDomItem.nextSibling)
	{
		if (!currentDomItem.tagName || currentDomItem.tagName.toLowerCase () != 'li')
			continue;
		if (currentDomItem.firstChild == null)
		{
			items[items.length] = _cpgSplit;
			continue;
		}
		var item = new Array ();
		var currentItem = currentDomItem.firstChild;
		var hasAction = false;
		for (; currentItem; currentItem = currentItem.nextSibling)
		{
			// scan for span or div tag
			if (!currentItem.tagName)
				continue;
			if (currentItem.className == 'cpgNoClick')
			{
				item[0] = _cpgNoClick;
				item[1] = getActionHTML (currentItem);
				hasAction = true;
				break;
			}
			if (currentItem.className == 'cpgNoAction')
			{
				item[0] = _cpgNoAction;
				item[1] = getActionHTML (currentItem);
				hasAction = true;
				break;
			}
			var tag = currentItem.tagName.toLowerCase ();
			if (tag != 'span')
				continue;
			if (!currentItem.firstChild)
				item[0] = null;
			else
				item[0] = currentItem.innerHTML;
			currentItem = currentItem.nextSibling;
			break;
		}
		if (hasAction)
		{
			items[items.length] = item;
			continue;
		}
		if (!currentItem)
			continue;
		for (; currentItem; currentItem = currentItem.nextSibling)
		{
			if (!currentItem.tagName)
				continue;
			var tag = currentItem.tagName.toLowerCase ();
			if (tag == 'a')
			{
				item[1] = currentItem.innerHTML;
				item[2] = currentItem.href;
				item[3] = currentItem.target;
				item[4] = currentItem.title;
				if (item[4] == '')
					item[4] = null;
			}
			else if (tag == 'span' || tag == 'div')
			{
				item[1] = currentItem.innerHTML;
				item[2] = null;
				item[3] = null;
				item[4] = null;
			}
			break;
		}

		for (; currentItem; currentItem = currentItem.nextSibling)
		{
			// scan for span tag
			if (!currentItem.tagName)
				continue;
			var tag = currentItem.tagName.toLowerCase ();
			if (tag != 'ul' && tag != 'ol')
				continue;
			var subMenuItems = cpgDrawFromTextSubMenu (currentItem);
			for (i = 0; i < subMenuItems.length; ++i)
				item[i + 5] = subMenuItems[i];
			break;
		}
		items[items.length] = item;
	}
	return items;
}

//
// obtain the actual action item's action, which is inside a
// table.  The first row should be it
//
function getActionHTML (htmlNode)
{
	var returnVal = '<td></td><td></td><td></td>';
	var currentDomItem;
	// find the table first
	for (currentDomItem = htmlNode.firstChild; currentDomItem; currentDomItem = currentDomItem.nextSibling)
	{
		if (currentDomItem.tagName && currentDomItem.tagName.toLowerCase () == 'table')
			break;
	}
	if (!currentDomItem)
		return returnVal;
	// skip over tbody
	for (currentDomItem = currentDomItem.firstChild; currentDomItem; currentDomItem = currentDomItem.nextSibling)
	{
		if (currentDomItem.tagName && currentDomItem.tagName.toLowerCase () == 'tbody')
			break;
	}
	if (!currentDomItem)
		return returnVal;
	// get the first tr
	for (currentDomItem = currentDomItem.firstChild; currentDomItem; currentDomItem = currentDomItem.nextSibling)
	{
		if (currentDomItem.tagName && currentDomItem.tagName.toLowerCase () == 'tr')
			break;
	}
	if (!currentDomItem)
		return returnVal;
	return currentDomItem.innerHTML;
}

//
// get the DOM object associated with the item
//
function cpgGetMenuItem (item)
{
	if (!item.subMenuID)
		return null;
	var subMenu = cpgGetObject (item.subMenuID);
	// we are dealing with a main menu item
	if (item.menu)
	{
		var menu = item.menu;
		// skip over table, tbody, tr, reach td
		subMenu = subMenu.firstChild.firstChild.firstChild.firstChild;
		var i;
		for (i = 0; i < menu.length; ++i)
		{
			if (menu[i] == item)
				return subMenu;
			subMenu = subMenu.nextSibling;
		}
	}
	else if (item.parentItem) // sub menu item
	{
		var menu = item.parentItem;
		var table = cpgGetObject (item.subMenuID + 'Table');
		if (!table)
			return null;
		// skip over table, tbody, reach tr
		subMenu = table.firstChild.firstChild;
		var i;
		for (i = 5; i < menu.length; ++i)
		{
			if (menu[i] == item)
				return subMenu;
			subMenu = subMenu.nextSibling;
		}
	}
	return null;
}

//
// disable a menu item
//
function cpgDisableItem (item, prefix)
{
	if (!item)
		return;
	var menuItem = cpgGetMenuItem (item);
	if (!menuItem)
		return;
	if (item.menu)
		menuItem.className = prefix + 'MainItemDisabled';
	else
		menuItem.className = prefix + 'MenuItemDisabled';
	item.isDisabled = true;
}

//
// enable a menu item
//
function cpgEnableItem (item, prefix)
{
	if (!item)
		return;
	var menuItem = cpgGetMenuItem (item);
	if (!menuItem)
		return;
	if (item.menu)
		menu.className = prefix + 'MainItem';
	else
		menu.className = prefix + 'MenuItem';
	item.isDisabled = true;
}

//////////////////////////////////////////////////////////////////////
//
// Mouse Event Handling Functions
//
//////////////////////////////////////////////////////////////////////

//
// action should be taken for mouse moving in to the menu item
//
// Here we just do things concerning this menu item, w/o opening sub menus.
//
function cpgItemMouseOver (obj, isMain, idSub, menuID, index, calledByOpenSub)
{
	if (!calledByOpenSub && _cpgClicked)
	{
		cpgItemMouseOverOpenSub (obj, isMain, idSub, menuID, index);
		return;
	}

	clearTimeout (_cpgTimeOut);

	if (_cpgItemList[index].isDisabled)
		return;

	var prefix = _cpgMenuList[menuID].prefix;

	if (!obj.cpgMenuID)
	{
		obj.cpgMenuID = menuID;
		obj.cpgIsMain = isMain;
	}

	var thisMenu = cpgGetThisMenu (obj, prefix);

	// insert obj into cpgItems if cpgItems doesn't have obj
	if (!thisMenu.cpgItems)
		thisMenu.cpgItems = new Array ();
	var i;
	for (i = 0; i < thisMenu.cpgItems.length; ++i)
	{
		if (thisMenu.cpgItems[i] == obj)
			break;
	}
	if (i == thisMenu.cpgItems.length)
	{
		//thisMenu.cpgItems.push (obj);
		thisMenu.cpgItems[i] = obj;
	}

	// hide the previous submenu that is not this branch
	if (_cpgCurrentItem)
	{
		// occationally, we get this case when user
		// move the mouse slowly to the border
		if (_cpgCurrentItem == obj || _cpgCurrentItem == thisMenu)
		{
			var item = _cpgItemList[index];
			cpgSetStatus (item);
			return;
		}

		var thatMenuInfo = _cpgMenuList[_cpgCurrentItem.cpgMenuID];
		var thatPrefix = thatMenuInfo.prefix;
		var thatMenu = cpgGetThisMenu (_cpgCurrentItem, thatPrefix);

		if (thatMenu != thisMenu.cpgParentMenu)
		{
			if (_cpgCurrentItem.cpgIsMain)
				_cpgCurrentItem.className = thatPrefix + 'MainItem';
			else
				_cpgCurrentItem.className = thatPrefix + 'MenuItem';
			if (thatMenu.id != idSub)
				cpgHideMenu (thatMenu, thisMenu, thatMenuInfo);
		}
	}

	// okay, set the current menu to this obj
	_cpgCurrentItem = obj;

	// just in case, reset all items in this menu to MenuItem
	cpgResetMenu (thisMenu, prefix);

	var item = _cpgItemList[index];
	var isDefaultItem = cpgIsDefaultItem (item);

	if (isDefaultItem)
	{
		if (isMain)
			obj.className = prefix + 'MainItemHover';
		else
			obj.className = prefix + 'MenuItemHover';
	}

	cpgSetStatus (item);
}

//
// action should be taken for mouse moving in to the menu item
//
// This function also opens sub menu
//
function cpgItemMouseOverOpenSub (obj, isMain, idSub, menuID, index)
{
	clearTimeout (_cpgTimeOut);

	if (_cpgItemList[index].isDisabled)
		return;

	cpgItemMouseOver (obj, isMain, idSub, menuID, index, true);

	if (idSub)
	{
		var subMenu = cpgGetObject (idSub);
		var menuInfo = _cpgMenuList[menuID];
		var orient = menuInfo.orient;
		var prefix = menuInfo.prefix;
		cpgShowSubMenu (obj, isMain, subMenu, menuInfo);
	}
}

//
// action should be taken for mouse moving out of the menu item
//
function cpgItemMouseOut (obj, isMain, idSub, menuID, index)
{
	var delayTime = _cpgMenuList[menuID].nodeProperties.delay;
	_cpgTimeOut = window.setTimeout ('cpgHideMenuTime ()', delayTime);
	window.defaultStatus = '';
}

//
// action should be taken for mouse button down at a menu item
//
function cpgItemMouseDown (obj, isMain, idSub, menuID, index)
{
	if (_cpgItemList[index].isDisabled)
		return;

	if (cpgIsDefaultItem (_cpgItemList[index]))
	{
		var prefix = _cpgMenuList[menuID].prefix;
		if (obj.cpgIsMain)
			obj.className = prefix + 'MainItemActive';
		else
			obj.className = prefix + 'MenuItemActive';
	}
}

//
// action should be taken for mouse button down at a menu item
// this is one also opens submenu if needed
//
function cpgItemMouseDownOpenSub (obj, isMain, idSub, menuID, index)
{
	if (_cpgItemList[index].isDisabled)
		return;

	_cpgClicked = true;
	cpgItemMouseDown (obj, isMain, idSub, menuID, index);

	if (idSub)
	{
		var subMenu = cpgGetObject (idSub);
		var menuInfo = _cpgMenuList[menuID];
		cpgShowSubMenu (obj, isMain, subMenu, menuInfo);
	}
}

//
// action should be taken for mouse button up at a menu item
//
function cpgItemMouseUp (obj, isMain, idSub, menuID, index)
{
	if (_cpgItemList[index].isDisabled)
		return;

	var item = _cpgItemList[index];

	var link = null, target = '_self';

	if (item.length > 2)
		link = item[2];
	if (item.length > 3 && item[3])
		target = item[3];

	if (link != null)
	{
		_cpgClicked = false;
		window.open (link, target);
	}

	var menuInfo = _cpgMenuList[menuID];
	var prefix = menuInfo.prefix;
	var thisMenu = cpgGetThisMenu (obj, prefix);

	var hasChild = (item.length > 5);
	if (!hasChild)
	{
		if (cpgIsDefaultItem (item))
		{
			if (obj.cpgIsMain)
				obj.className = prefix + 'MainItem';
			else
				obj.className = prefix + 'MenuItem';
		}
		cpgHideMenu (thisMenu, null, menuInfo);
	}
	else
	{
		if (cpgIsDefaultItem (item))
		{
			if (obj.cpgIsMain)
				obj.className = prefix + 'MainItemHover';
			else
				obj.className = prefix + 'MenuItemHover';
		}
	}
}

//////////////////////////////////////////////////////////////////////
//
// Mouse Event Support Utility Functions
//
//////////////////////////////////////////////////////////////////////

//
// move submenu to the appropriate location
//
function cpgMoveSubMenu (obj, isMain, subMenu, menuInfo)
{
	var orient = menuInfo.orient;

	var offsetAdjust;

	if (isMain)
	{
		if (orient.charAt (0) == 'h')
			offsetAdjust = menuInfo.nodeProperties.offsetHMainAdjust;
		else
			offsetAdjust = menuInfo.nodeProperties.offsetVMainAdjust;
	}
	else
		offsetAdjust = menuInfo.nodeProperties.offsetSubAdjust;

	if (!isMain && orient.charAt (0) == 'h')
		orient = 'v' + orient.charAt (1) + orient.charAt (2);

	var mode = String (orient);
	var p = subMenu.offsetParent;
	var subMenuWidth = cpgGetWidth (subMenu);
	var horiz = cpgGetHorizontalAlign (obj, mode, p, subMenuWidth);
	if (mode.charAt (0) == 'h')
	{
		if (mode.charAt (1) == 'b')
			subMenu.style.top = (cpgGetYAt (obj, p) + cpgGetHeight (obj) + offsetAdjust[1]) + 'px';
		else
			subMenu.style.top = (cpgGetYAt (obj, p) - cpgGetHeight (subMenu) - offsetAdjust[1]) + 'px';
		if (horiz == 'r')
			subMenu.style.left = (cpgGetXAt (obj, p) + offsetAdjust[0]) + 'px';
		else
			subMenu.style.left = (cpgGetXAt (obj, p) + cpgGetWidth (obj) - subMenuWidth - offsetAdjust[0]) + 'px';
	}
	else
	{
		if (horiz == 'r')
			subMenu.style.left = (cpgGetXAt (obj, p) + cpgGetWidth (obj) + offsetAdjust[0]) + 'px';
		else
			subMenu.style.left = (cpgGetXAt (obj, p) - subMenuWidth - offsetAdjust[0]) + 'px';
		if (mode.charAt (1) == 'b')
			subMenu.style.top = (cpgGetYAt (obj, p) + offsetAdjust[1]) + 'px';
		else
			subMenu.style.top = (cpgGetYAt (obj, p) + cpgGetHeight (obj) - cpgGetHeight (subMenu) + offsetAdjust[1]) + 'px';
	}

	// IE specific iframe masking method
	/*@cc_on
		@if (@_jscript_version >= 5.5)
			if (menuInfo.cpgFrameMasking)
			{
				if (!subMenu.cpgFrameObj)
				{
					var frameObj = cpgAllocFrame ();
					subMenu.cpgFrameObj = frameObj;
				}

				var frameObj = subMenu.cpgFrameObj;
				frameObj.style.zIndex = subMenu.style.zIndex - 1;
				frameObj.style.left = (cpgGetX (subMenu) - cpgGetX (frameObj.offsetParent)) + 'px';
				frameObj.style.top = (cpgGetY (subMenu)  - cpgGetY (frameObj.offsetParent)) + 'px';
				frameObj.style.width = cpgGetWidth (subMenu) + 'px';
				frameObj.style.height = cpgGetHeight (subMenu) + 'px';
				frameObj.style.display = 'block';
			}
		@end
	@*/
	if (horiz != orient.charAt (2))
		orient = orient.charAt (0) + orient.charAt (1) + horiz;
	return orient;
}

//
// automatically re-adjust the menu position based on available screen size.
//
function cpgGetHorizontalAlign (obj, mode, p, subMenuWidth)
{
	var horiz = mode.charAt (2);
	if (!(document.body))
		return horiz;
	var body = document.body;
	var browserLeft;
	var browserRight;
	if (window.innerWidth)
	{
		// DOM window attributes
		browserLeft = window.pageXOffset;
		browserRight = window.innerWidth + browserLeft;
	}
	else if (body.clientWidth)
	{
		// IE attributes
		browserLeft = body.clientLeft;
		browserRight = body.clientWidth + browserLeft;
	}
	else
		return horiz;
	if (mode.charAt (0) == 'h')
	{
		if (horiz == 'r' && (cpgGetXAt (obj) + subMenuWidth) > browserRight)
			horiz = 'l';
		if (horiz == 'l' && (cpgGetXAt (obj) + cpgGetWidth (obj) - subMenuWidth) < browserLeft)
			horiz = 'r';
		return horiz;
	}
	else
	{
		if (horiz == 'r' && (cpgGetXAt (obj, p) + cpgGetWidth (obj) + subMenuWidth) > browserRight)
			horiz = 'l';
		if (horiz == 'l' && (cpgGetXAt (obj, p) - subMenuWidth) < browserLeft)
			horiz = 'r';
		return horiz;
	}
}

//
// show the subMenu w/ specified orientation
// also move it to the correct coordinates
//
function cpgShowSubMenu (obj, isMain, subMenu, menuInfo)
{
	var prefix = menuInfo.prefix;

	if (!subMenu.cpgParentMenu)
	{
		// establish the tree w/ back edge
		var thisMenu = cpgGetThisMenu (obj, prefix);
		subMenu.cpgParentMenu = thisMenu;
		if (!thisMenu.cpgSubMenu)
			thisMenu.cpgSubMenu = new Array ();
		thisMenu.cpgSubMenu[thisMenu.cpgSubMenu.length] = subMenu;
	}

	var effectInstance = subMenu.cpgEffect;
	if (effectInstance)
		effectInstance.showEffect (true);
	else
	{
		// position the sub menu only if we are not already showing the submenu
		var orient = cpgMoveSubMenu (obj, isMain, subMenu, menuInfo);
		subMenu.cpgOrient = orient;

		var forceShow = false;
		if (subMenu.style.visibility != 'visible' && menuInfo.nodeProperties.effect)
		{
			try
			{
				effectInstance = menuInfo.nodeProperties.effect.getInstance (subMenu, orient);
				effectInstance.showEffect (false);
			}
			catch (e)
			{
				forceShow = true;
				subMenu.cpgEffect = null;
			}
		}
		else
			forceShow = true;

		if (forceShow)
		{
			subMenu.style.visibility = 'visible';
			/*@cc_on
				@if (@_jscript_version >= 5.5)
					if (subMenu.cpgFrameObj)
						subMenu.cpgFrameObj.style.display = 'block';
				@end
			@*/
		}
	}

	if (!_cpgHideObjects)
	{
		_cpgHideObjects = 2;	// default = not hide, may change behavior later
		try
		{
			if (window.opera)
			{
				if (parseInt (navigator.appVersion) < 9)
					_cpgHideObjects = 1;
			}
		}
		catch (e)
		{
		}
	}

	if (_cpgHideObjects == 1)
	{
		if (!subMenu.cpgOverlap)
			subMenu.cpgOverlap = new Array ();
		cpgHideControl ("IFRAME", subMenu);
		cpgHideControl ("OBJECT", subMenu);
	}
}

//
// reset all the menu items to class MenuItem in thisMenu
//
function cpgResetMenu (thisMenu, prefix)
{
	if (thisMenu.cpgItems)
	{
		var i;
		var str;
		var items = thisMenu.cpgItems;
		for (i = 0; i < items.length; ++i)
		{
			if (items[i].cpgIsMain)
			{
				if (items[i].className == (prefix + 'MainItemDisabled'))
					continue;
			}
			else
			{
				if (items[i].className == (prefix + 'MenuItemDisabled'))
					continue;
			}
			if (items[i].cpgIsMain)
				str = prefix + 'MainItem';
			else
				str = prefix + 'MenuItem';
			if (items[i].className != str)
				items[i].className = str;
		}
	}
}

//
// called by the timer to hide the menu
//
function cpgHideMenuTime ()
{
	_cpgClicked = false;
	if (_cpgCurrentItem)
	{
		var menuInfo = _cpgMenuList[_cpgCurrentItem.cpgMenuID];
		var prefix = menuInfo.prefix;
		cpgHideMenu (cpgGetThisMenu (_cpgCurrentItem, prefix), null, menuInfo);
		_cpgCurrentItem = null;
	}
}

//
// Only hides this menu
//
function cpgHideThisMenu (thisMenu, menuInfo)
{
	var effectInstance = thisMenu.cpgEffect;
	if (effectInstance)
		effectInstance.hideEffect (true);
	else
	{
		thisMenu.style.visibility = 'hidden';
		thisMenu.style.top = '0px';
		thisMenu.style.left = '0px';
		thisMenu.cpgOrient = null;
		/*@cc_on
			@if (@_jscript_version >= 5.5)
				if (thisMenu.cpgFrameObj)
				{
					var frameObj = thisMenu.cpgFrameObj;
					frameObj.style.display = 'none';
					frameObj.style.width = '1px';
					frameObj.style.height = '1px';
					thisMenu.cpgFrameObj = null;
					cpgFreeFrame (frameObj);
				}
			@end
		@*/
	}

	cpgShowControl (thisMenu);
	thisMenu.cpgItems = null;
}

//
// hide thisMenu, children of thisMenu, as well as the ancestor
// of thisMenu until currentMenu is encountered.  currentMenu
// will not be hidden
//
function cpgHideMenu (thisMenu, currentMenu, menuInfo)
{
	var prefix = menuInfo.prefix;
	var str = prefix + 'SubMenu';

	// hide the down stream menus
	if (thisMenu.cpgSubMenu)
	{
		var i;
		for (i = 0; i < thisMenu.cpgSubMenu.length; ++i)
		{
			cpgHideSubMenu (thisMenu.cpgSubMenu[i], menuInfo);
		}
	}

	// hide the upstream menus
	while (thisMenu && thisMenu != currentMenu)
	{
		cpgResetMenu (thisMenu, prefix);
		if (thisMenu.className == str)
		{
			cpgHideThisMenu (thisMenu, menuInfo);
		}
		else
			break;
		thisMenu = cpgGetThisMenu (thisMenu.cpgParentMenu, prefix);
	}
}

//
// hide thisMenu as well as its sub menus if thisMenu is not
// already hidden
//
function cpgHideSubMenu (thisMenu, menuInfo)
{
	if (thisMenu.style.visibility == 'hidden')
		return;
	if (thisMenu.cpgSubMenu)
	{
		var i;
		for (i = 0; i < thisMenu.cpgSubMenu.length; ++i)
		{
			cpgHideSubMenu (thisMenu.cpgSubMenu[i], menuInfo);
		}
	}
	var prefix = menuInfo.prefix;
	cpgResetMenu (thisMenu, prefix);
	cpgHideThisMenu (thisMenu, menuInfo);
}

//
// hide a control such as IFRAME
//
function cpgHideControl (tagName, subMenu)
{
	var x = cpgGetX (subMenu);
	var y = cpgGetY (subMenu);
	var w = subMenu.offsetWidth;
	var h = subMenu.offsetHeight;

	var i;
	for (i = 0; i < document.all.tags(tagName).length; ++i)
	{
		var obj = document.all.tags(tagName)[i];
		if (!obj || !obj.offsetParent)
			continue;

		// check if the object and the subMenu overlap

		var ox = cpgGetX (obj);
		var oy = cpgGetY (obj);
		var ow = obj.offsetWidth;
		var oh = obj.offsetHeight;

		if (ox > (x + w) || (ox + ow) < x)
			continue;
		if (oy > (y + h) || (oy + oh) < y)
			continue;

		// if object is already made hidden by a different
		// submenu then we dont want to put it on overlap list of
		// of a submenu a second time.
		// - bug fixed by Felix Zaslavskiy
		if(obj.style.visibility == 'hidden')
			continue;

		//subMenu.cpgOverlap.push (obj);
		subMenu.cpgOverlap[subMenu.cpgOverlap.length] = obj;
		obj.style.visibility = 'hidden';
	}
}

//
// show the control hidden by the subMenu
//
function cpgShowControl (subMenu)
{
	if (subMenu.cpgOverlap)
	{
		var i;
		for (i = 0; i < subMenu.cpgOverlap.length; ++i)
			subMenu.cpgOverlap[i].style.visibility = "";
	}
	subMenu.cpgOverlap = null;
}

//
// returns the main menu or the submenu table where this obj (menu item)
// is in
//
function cpgGetThisMenu (obj, prefix)
{
	var str1 = prefix + 'SubMenu';
	var str2 = prefix + 'Menu';
	while (obj)
	{
		if (obj.className == str1 || obj.className == str2)
			return obj;
		obj = obj.parentNode;
	}
	return null;
}

//
// A special effect function to hook the menu which contains
// special effect object to the timer.
//
function cpgTimeEffect (menuID, show, delayTime)
{
	window.setTimeout ('cpgCallEffect("' + menuID + '",' + show + ')', delayTime);
}

//
// A special effect function.  Called by timer.
//
function cpgCallEffect (menuID, show)
{
	var menu = cpgGetObject (menuID);
	if (!menu || !menu.cpgEffect)
		return;
	try
	{
		if (show)
			menu.cpgEffect.showEffect (false);
		else
			menu.cpgEffect.hideEffect (false);
	}
	catch (e)
	{
	}
}

//
// return true if this item is handled using default handlers
//
function cpgIsDefaultItem (item)
{
	if (item == _cpgSplit || item[0] == _cpgNoAction || item[0] == _cpgNoClick)
		return false;
	return true;
}

//
// returns the object baring the id
//
function cpgGetObject (id)
{
	if (document.all)
		return document.all[id];
	return document.getElementById (id);
}

//
// functions that obtain the width of an HTML element.
//
function cpgGetWidth (obj)
{
	var width = obj.offsetWidth;
	if (width > 0 || !cpgIsTRNode (obj))
		return width;
	if (!obj.firstChild)
		return 0;
	// use TABLE's length can cause an extra pixel gap
	//return obj.parentNode.parentNode.offsetWidth;

	// use the left and right child instead
	return obj.lastChild.offsetLeft - obj.firstChild.offsetLeft + cpgGetWidth (obj.lastChild);
}

//
// functions that obtain the height of an HTML element.
//
function cpgGetHeight (obj)
{
	var height = obj.offsetHeight;
	if (height > 0 || !cpgIsTRNode (obj))
		return height;
	if (!obj.firstChild)
		return 0;
	// use the first child's height
	return obj.firstChild.offsetHeight;
}

//
// functions that obtain the coordinates of an HTML element
//
function cpgGetX (obj)
{
	if (!obj)
		return 0;
	var x = 0;

	do
	{
		x += obj.offsetLeft;
		obj = obj.offsetParent;
	}
	while (obj);
	return x;
}

function cpgGetXAt (obj, elm)
{
	var x = 0;

	while (obj && obj != elm)
	{
		x += obj.offsetLeft;
		obj = obj.offsetParent;
	}
	if (obj == elm)
		return x;
	return x - cpgGetX (elm);
}

function cpgGetY (obj)
{
	if (!obj)
		return 0;
	var y = 0;
	do
	{
		y += obj.offsetTop;
		obj = obj.offsetParent;
	}
	while (obj);
	return y;
}

function cpgIsTRNode (obj)
{
	var tagName = obj.tagName;
	return tagName == "TR" || tagName == "tr" || tagName == "Tr" || tagName == "tR";
}

//
// get the Y position of the object.  In case of TR element though,
// we attempt to adjust the value.
//
function cpgGetYAt (obj, elm)
{
	var y = 0;

	if (!obj.offsetHeight && cpgIsTRNode (obj))
	{
		var firstTR = obj.parentNode.firstChild;
		obj = obj.firstChild;
		y -= firstTR.firstChild.offsetTop;
	}

	while (obj && obj != elm)
	{
		y += obj.offsetTop;
		obj = obj.offsetParent;
	}

	if (obj == elm)
		return y;
	return y - cpgGetY (elm);
}

//
// extract description from the menu item and set the status text
//
function cpgSetStatus (item)
{
	var descript = '';
	if (item.length > 4)
		descript = (item[4] != null) ? item[4] : (item[2] ? item[2] : descript);
	else if (item.length > 2)
		descript = (item[2] ? item[2] : descript);

	window.defaultStatus = descript;
}

//
// debug function, ignore :)
//
function cpgGetProperties (obj)
{
	if (obj == undefined)
		return 'undefined';
	if (obj == null)
		return 'null';

	var msg = obj + ':\n';
	var i;
	for (i in obj)
		msg += i + ' = ' + obj[i] + '; ';
	return msg;
}

/* v2.0.3			1. Fix an issue with IE6 displaying menu over HTTPS connection.
						Thanks to Paul Horton for reporting the bug and testing
						possible solutions. */
/* v2.0.2			1. Minor clean up and some attempts to reduce memory leak in IE. */
/* v2.0.1			1. Disable iframe masking for IE7 since it is no longer necessary. */
/* v2.0				1. improves the way handling flash/iframe/select boxes in IE
						and firefox and Opera 9.  Hiding these elements is no
						longer necessary.  For older versions of Opera, flash/iframe
						still need to be hidden.
					2. Improves cpgDrawFromText ().  Also allows custom actions.
					3. Improves clickOpen behavior.  Now once a submenu is opened,
						opening other sub menus no longer requires clicking.
					4. Special Effects.  This version has hooks that allow people
						to install special effects to various themes.
					5. For a given menu item, cpgGetMenuitem(item) provides the ability
						to find the corresponding DOM element.
					6. Disable API.  If you know which item to disable, you can call
						cpgDisableItem(item, themePrefix) and cpgEnableItem(item, themePrefix).
						However, you will have to provide your own CSS for the item.
						For purposes other than to disable an item, cpgGetMenuItem (item)
						is provided for locating HTML DOM element of the menu item in concern.
					7. Better z-index.  Now you can specify in the theme property the
						starting z-index and incremental step for submenus.
					8. Allow themes to insert additional elements before and after
						the sub menu table.
					9. Improved themes.  More organized and easier to customize.
					10. Add a flag to control hiding/nohiding objects/iframes.  By default,
						only Opera before 9 hides objects.
					11. Add new property options to control submenu positions to fine tune
						the look.
					12. It is no longer necessary to specify the theme name while calling
						cpgDraw and cpgDrawFromText.  Currently it still accepts it, but it
						will not in the future.
*/
/* v1.4.4			1. a quick fix for a bug for _cpgSplit checking.  reported by
						Son Nguyen.
*/
/* v1.4.3			1. changed how _cpgSplit is handled a bit so that _cpgNoClick can work
						properly.  All splits in predefined themes are changed to use
						_cpgNoClick instead of _cpgNoAction.
*/
/* v1.4.2			1. fixed _cpgNoClick mouse hoover bug.
					2. fixed a statusbar text problem that cause text to disappear when
						hoovering mouse within the same menu item.
					3. changed the behavior of cpgDrawFromText s.t. if the title of the
						of a link is empty, the actual url is used as text.  To clear
						this link information, title needs to be ' '.
*/
/* v1.4.1			1. fixed a problem introduced in 1.4 where re-entering a main menu
						item which doesn't have a child can disable its hover setting.
						Apparently I deleted an extra line of code when I was doing
						cleaning up.  Reported by David Maliachi and a few others.
*/
/* JSCookMenu v1.4	1. fixed a minor td cell closure problem.  Thanks to Georg Lorenz
					   <georg@lonux.de> for discovering that.
					2. added clickOpen to nodeProperties.  See _cpgNodeProperties for
						description.  Basically menus can be opened on click only.
					3. added an ability to draw menu from an html node instead of a javascript
						tree, making this script search bot friendly (I hope?).
*/
/* JSCookMenu v1.31 1. fix a bug on IE with causes submenus to display at the top
					   left corner due to doctype.  The fix was provided by
					   Burton Strauss <Burton@ntopsupport.com>.
*/
/* JSCookMenu v1.3	1. automatically realign (left and right) the submenu when
					   client space is not enough.
					2. add _cpgNoClick to get rid of menu closing behavior
					   on the particular menu item, to make it possible for things
					   such as search box to be inside the menu.
*/
/* JSCookMenu v1.25	1. fix Safari positioning issue.  The problem is that all TR elements are located
					   at the top left corner.  Thus, need to obtain the "virtual"
					   position of these element could be at.
*/
/* JSCookMenu v1.24	1. fix window based control hiding bug
					   thanks to Felix Zaslavskiy <felix@bebinary.com> for the fix.
*/
/* JSCookMenu v1.23	1. correct a position bug when the container is positioned.
					  thanks to Andre <anders@netspace.net.au> for narrowing down
					  the problem.
*/
/* JSCookMenu v1.22	1. change Array.push (obj) call to Array[length] = obj.
					   Suggestion from Dick van der Kaaden <dick@netrex.nl> to
					   make the script compatible with IE 5.0
					2. Changed theme files a little to add z-index: 100 for sub
					   menus.  This change is necessary for Netscape to avoid
					   a display problem.
					3. some changes to the DOM structure to make this menu working
					   on Netscape 6.0 (tested).  The main reason is that NN6 does
					   not do absolute positioning with tables.  Therefore an extra
					   div layer must be put around the table.
*/
/* JSCookMenu v1.21	1. fixed a bug that didn't add 'px' as part of coordinates.
					   JSCookMenu should be XHTML validator friendly now.
					2. removed unnecessary display attribute and corresponding
					   theme entry to fix a problem that Netscape sometimes
					   render Office theme incorrectly
*/
/* JSCookMenu v1.2.	1. fix the problem of showing status in Netscape
					2. changed the handler parameters a bit to allow
					   string literals to be passed to javascript based
					   links
					3. having null in target field would cause the link
					   to be opened in the current window, but this behavior
					   could change in the future releases
*/
/* JSCookMenu v1.1.		added ability to hide controls in IE to show submenus properly */
/* JSCookMenu v1.01.	cpgDraw generates XHTML code */
/* JSCookMenu v1.0.		(c) Copyright 2002 by Heng Yuan */
