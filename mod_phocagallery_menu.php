<?php
/*
 * @package Joomla 1.5
 * @copyright Copyright (C) 2005 Open Source Matters. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 *
 * @module Phoca - Phoca Gallery Module
 * @copyright Copyright (C) Jan Pavelka www.phoca.cz
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL
 * @based on javascript: dTree 2.05 www.destroydrop.com/javascript/tree/
 * @copyright (c) 2002-2003 Geir Landrö
 */
defined('_JEXEC') or die('Restricted access');// no direct access

// Include Phoca Gallery
if (!JComponentHelper::isEnabled('com_phocagallery', true)) {
    echo '<div class="alert alert-danger">Phoca Gallery Error: Phoca Gallery component is not installed or not published on your system</div>';
    return;
}

if (!class_exists('PhocaGalleryLoader')) {
    require_once( JPATH_ADMINISTRATOR.'/components/com_phocagallery/libraries/loader.php');
}

phocagalleryimport('phocagallery.path.path');
phocagalleryimport('phocagallery.path.route');
phocagalleryimport('phocagallery.library.library');
phocagalleryimport('phocagallery.text.text');
phocagalleryimport('phocagallery.access.access');
phocagalleryimport('phocagallery.file.file');
phocagalleryimport('phocagallery.file.filethumbnail');
phocagalleryimport('phocagallery.image.image');
phocagalleryimport('phocagallery.image.imagefront');
phocagalleryimport('phocagallery.render.renderfront');
phocagalleryimport('phocagallery.render.renderadmin');
phocagalleryimport('phocagallery.render.renderdetailwindow');
phocagalleryimport('phocagallery.ordering.ordering');
phocagalleryimport('phocagallery.picasa.picasa');
phocagalleryimport('phocagallery.html.category');


$user 		= JFactory::getUser();
$db 		= JFactory::getDBO();
$app 		= JFactory::getApplication('site');
$menu  		= $app->getMenu();
$document	= JFactory::getDocument();

// PARAMS
$menu_theme 	= $params->get( 'menu_theme', 'ThemePhoca' );
$menu_type	 	= $params->get( 'menu_type', 'hbr' );//hbr,hbl,hur,hul,vbr,vbl,vur,vul

switch ($menu_type) {
	case 'hbl':
	case 'hul':
	case 'vbl':
	case 'vul':
		$themeCss		= 'themeLeft.css';
		$themeJs		= 'themeLeft.js';
	break;

	default:
		$themeCss		= 'theme.css';
		$themeJs		= 'theme.js';
	break;

}

$document->addScript( JURI::base(true) . '/media/mod_phocagallery_menu/JSCookMenu.js' );
$document->addScript( JURI::base(true) . '/media/mod_phocagallery_menu/effect.js' );
$document->addStyleSheet( JURI::base(true).'/media/mod_phocagallery_menu/'.$menu_theme.'/'.$themeCss);

$document->addCustomTag(
 '<script type="text/javascript" >' . "\n"
.'var cpg'.$menu_theme.'Base = \''.JURI::base(true).'/media/mod_phocagallery_menu/'.$menu_theme.'/\';'
."\n"
.'</script>'."\n"
.'<script type="text/javascript" src="'.JURI::base(true).'/media/mod_phocagallery_menu/'.$menu_theme.'/'.$themeJs.'" ></script>' . "\n"
);

//Image Path
$imgPath = JURI::base(true) . '/media/mod_phocagallery_menu/';
//Unique id for more modules
$treeId = "PhocaGallery_".uniqid( "menu_" );

// Current category info
$id 	= $app->input->get( 'id', 0, 'int' );
$option = $app->input->get( 'option', 0, 'string' );
$view 	= $app->input->get( 'view', 0, 'string' );

if ( $option == 'com_phocagallery' && $view == 'category' ) {
	$categoryId = $id;
} else {
	$categoryId = 0;
}

// PARAMS
$hide_categories = $params->get( 'hide_categories', '' );

// PARAMS - Hide categories
$hideCat		= trim( $hide_categories );
$hideCatArray	= explode( ';', $hide_categories );
$hideCatSql		= '';
if (is_array($hideCatArray)) {
	foreach ($hideCatArray as $value) {
		$hideCatSql .= ' AND cc.id != '. (int) trim($value) .' ';
	}
}

// PARAMS - Access Category - display category in category list, which user cannot access
$display_access_category = $params->get( 'display_access_category',0 );

// ACCESS - Only registered or not registered
$hideCatAccessSql = '';
/*
if ($display_access_category == 0) {
 $hideCatAccessSql = ' AND cc.access <= '. $user->get('aid', 0);
} */
/*
$aid = max ($user->getAuthorisedViewLevels());
if ($display_access_category == 0) {
 $hideCatAccessSql = ' AND cc.access <= '. $aid;
} */
if ($display_access_category == 0) {
	$groups = $user->getAuthorisedViewLevels();
	if (count($groups)) {
		$hideCatAccessSql = ' AND cc.access IN(' . implode(',', $groups) . ')';
	} else {
		$hideCatAccessSql = '';
	}
}

function phocaGalleryMenuModuleMenuDown(&$menuItems, $category_id = 0, $level = 0, &$hideCatSql, &$hideCatAccessSql, $user, $display_access_category) {
		$db			= JFactory::getDBO();
		static $mdi = 0;
		$level++;

		$query = 'SELECT cc.title AS text, cc.id AS id, cc.parent_id as parentid, cc.alias as alias, cc.access as access, cc.accessuserid as accessuserid'
		. ' FROM #__phocagallery_categories AS cc'
		. ' WHERE cc.published = 1'
		. ' AND cc.approved = 1'
		. ' AND cc.parent_id = '.$category_id
		. $hideCatSql
		. $hideCatAccessSql
		. ' ORDER BY cc.parent_id,cc.ordering ASC';
		$db->setQuery( $query );
		$categoryData = $db->loadObjectList();

		if(isset($categoryData) && !empty($categoryData)) {
			foreach ($categoryData as $key => $value) {

				// USER RIGHT - ACCESS =======================================
				$rightDisplay	= 1;
				if (isset($categoryData[$key])) {
					//$rightDisplay = PhocaGalleryAccess::getUserRight( 'accessuserid', $categoryData[$key]->accessuserid , $categoryData[$key]->access, $user->get('aid', 0), $user->get('id', 0), $display_access_category);

					$rightDisplayDelete = PhocaGalleryAccess::getUserRight('accessuserid', $categoryData[$key]->accessuserid, $categoryData[$key]->access, $user->getAuthorisedViewLevels(), $user->get('id', 0), $display_access_category);
				}

				if ($rightDisplay == 0) {
				} else {
					$link = JRoute::_(PhocaGalleryRoute::getCategoryRoute($value->id, $value->alias));
					if( $mdi != 0 ) {
						$menuItems.= ",";
					}
					$menuItems.= '[null,\''.addslashes($value->text).'\',\''.str_replace('&amp;','&',$link).'\', null, \''.addslashes($value->text).'\'';
					$mdi++;

					// get subcategories - recursive
					$menuItems = phocaGalleryMenuModuleMenuDown($menuItems, $value->id, $level,$hideCatSql,$hideCatAccessSql, $user, $display_access_category);
				}

				// end of the loop
				$menuItems.= "]";
			}
		}
		return $menuItems;
	}

$menuItems = '';
$jsCookMenu = phocaGalleryMenuModuleMenuDown($menuItems,0,0,$hideCatSql,$hideCatAccessSql,$user, $display_access_category);



/*
// Categories (Head)
$menu 				= &JSite::getMenu();
$itemsCategories	= $menu->getItems('link', 'index.php?option=com_phocagallery&view=categories');
$linkCategories 	= '';
if(isset($itemsCategories[0])) {
	$itemId = $itemsCategories[0]->id;
	$linkCategories = JRoute::_('index.php?option=com_phocagallery&view=categories&Itemid='.$itemId);
}*/

// Create javascript code
$output = '';
$output.='<div align="left" class="mainlevel" id="div_'.$treeId.'"></div>';
$output.='<script type="text/javascript" defer="defer">'."\n";
$output.='<!--'."\n";
$output.='var '.$treeId.' = 
[' . "\n";
$output.= $jsCookMenu;
$output .= '];';
$output.=''."\n";
//$output.='var propPG = cpgClone(cpgThemeGray);'."\n";
//$output.='propPG.effect = new CMSlidingEffect(8);'."\n";
//$output.='cpgDraw (\'div_'.$treeId.'\', '.$treeId.', \'hbr\',cpgThemeGray, \'ThemeGray\');';
$output.='cpgDraw (\'div_'.$treeId.'\', '.$treeId.', \''.$menu_type.'\', cpg'.$menu_theme.', \''.$menu_theme.'\');';
$output.=''."\n";
$output.='//-->'."\n";
$output.='</script>';


require(JModuleHelper::getLayoutPath('mod_phocagallery_menu'));
?>
