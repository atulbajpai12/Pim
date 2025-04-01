#!/usr/bin/perl -w

# Copyright 2020-2021 Atle Solbakken atle@goliathdns.no / Posten Norge AS

# Any use, copying, modification or distribution of this code by others than
# representatives for Posten Norge AS or its vendors in service of Posten Norge AS
# is not permitted. Other use, copying, modification or distribution is permitted.

# By modifying this file you agree to the following terms:
# - You will not claim copyright or ownership to any modifications or additions 
# - All rights and ownership to any modifications or additions are credited to the
#   original copyright holders
# - Any modifications must immediately be presented back to the original copyright holders
# - This full original license header must remain unchanged

package main;

use rrr::rrr_helper;
use rrr::rrr_helper::rrr_message;
use rrr::rrr_helper::rrr_settings;
use rrr::rrr_helper::rrr_debug;

use strict;
use Sys::Hostname;
use Socket qw( :DEFAULT inet_ntop );
use bytes;
use Time::HiRes qw( gettimeofday tv_interval );
use POSIX;
use Data::Dumper;

my $debug = { };
bless $debug, "rrr::rrr_helper::rrr_debug";

my $global_settings = undef;

sub make_ident_msg {
	my $msg = shift;
	my $ident = shift;
	$msg = "<IDENT:" . zerofill ($ident, 7) . "> $msg";
}

sub print_error {
	my $msg = shift;
	$debug->msg(0, $msg);
}

sub print_info {
	my $msg = shift;
	$debug->msg(1, $msg);
}

sub print_debug {
	my $msg = shift;
	$debug->msg(3, $msg);
}

sub print_error_ident {
	my $msg = shift;
	my $measuringpoint_user_id = shift;
	$msg = make_ident_msg($msg, $measuringpoint_user_id);
	print_error($msg);
}

sub print_info_ident {
	my $msg = shift;
	my $measuringpoint_user_id = shift;
	$msg = make_ident_msg($msg, $measuringpoint_user_id);
	print_info($msg);
}

sub print_debug_ident {
	my $msg = shift;
	my $measuringpoint_user_id = shift;
	$msg = make_ident_msg($msg, $measuringpoint_user_id);
	print_debug($msg);
}

sub set_ip {
	my $message = shift;
	my $ip_addr = shift;
	my $port = shift;
	my $ip_so_type = shift;

	my $result = $message->ip_set($ip_addr, $port);
	   $result += $message->ip_set_protocol($ip_so_type);
	
	if ($result != 2) {
		print_error("Warning: Error while setting IP/protocol in message\n");
	}

	return ($result == 2);
}

# Returns first value only
sub get_from_tag_first {
	my $message = shift;
	my $tag = shift;

	return ($message->get_tag_all($tag))[0];
}

# Returns first value only, return empty string for undefined values
sub get_from_tag_first_string {
	my $message = shift;
	my $tag = shift;

	my $value = ($message->get_tag_all($tag))[0];

	return defined $value ? $value : "";
}

# Returns first value only
sub get_from_tag_or_default {
	my $message = shift;
	my $tag = shift;
	my $default = shift;
	
	my $result = ($message->get_tag_all($tag))[0];
	
	if (!defined $result) {
		return $default;
	}
	
	return $result;
}

sub set_tag_blob {
	my $message = shift;
	my $tag = shift;
	my $value = shift;
	if (!defined $value or $value eq "") {
		print_info("Warning: Pushed empty value for tag $tag to array\n");
	}
	return $message->set_tag_blob($tag, $value, length $value);
}

sub config {
	my $settings = shift;
	
	my %tmp;	

	my @keys = ();
	my @keys_yes_no = ();

	foreach my $key (@keys) {
		$tmp{$key} = $settings->get($key);
		if (!defined $tmp{$key}) {
			$tmp{$key} = "";
		}
	}

	foreach my $key (@keys_yes_no) {
		if ($tmp{$key} =~ /^(no?|0)$/i) {
			$tmp{$key} = 0;
		}
		elsif ($tmp{$key} =~ /^(y(es|)|1)$/i) {
			$tmp{$key} = 1;
		}
		else {
			print_error ("Warning: Could not understand yes/no configuration parameter $key, value was '$tmp{$key}'. Defaulting to 'no'.\n");
			$tmp{$key} = 0;
		}
	}

	$global_settings = \%tmp;

	print_info ("Starting RRR LBS Print Daemon\n");

	return 1;
}

sub ensure_port {
	my $port = shift;

	if ($port < 1) {
		$port = "9100";
	}

	return $port;
}

sub send_message_ip {
	my $message = shift;
	$message->{'topic'} = "lbs/print";
	$message->send();
}

sub send_label_message_raw {
	my $message = shift;
	my $printer_ip = shift;
	my $printer_ip_force = shift;
	my $printer_port = ensure_port(shift);
	my $printer_disable = shift;

	my $use_ip = $printer_ip;
	if (defined $printer_ip_force && $printer_ip_force !~ /no(|ne)/) {
		$use_ip = $printer_ip_force;
		print_info("Note: Forcing printer to '$use_ip' per configuration\n");
	}

	if (set_ip($message, $use_ip, $printer_port, "tcp") != 1) {
		print("Warning: Error while setting IP of message in send_label_message_raw\n");
		return 1; # Non-critical
	}

	if ($printer_disable =~ /yes/) {
		print_info("Note: Printer is defined but printing is disabled by configuration parameter lbs_disable_printer. Not sending message to printer.\n");
	}
	else {
		send_message_ip($message);
	}
	
	return 1;
}

sub send_label_message {
	my $message = shift;
	my $printer_ip = shift;
	my $printer_ip_force = shift;
	my $printer_port = shift;
	my $printer_disable = shift;
	my $printer_template = shift;

	# print_info($printer_template);

	if ($printer_template eq "") {
		print_error("No ZPL could be used while sending label to printer\n");
		return 1; # Non-critical
	}

	my $zpl_barcode = get_from_tag_first_string($message,'print_barcode');
	$zpl_barcode =~ s/^(...)/$1>5/;

	#my @all_tags = $message->get_tag_names();
	#print_info("Tags: " . join ("\n", @all_tags) . "\n");

	my $internnr = get_from_tag_first_string($message, 'event_measuringpoint_id');
	my $chute = get_from_tag_first($message, 'chute_name');
	my $tray_count = get_from_tag_first($message, 'tray_count');

	my %replacements;

	$replacements{"[STREKKODE]"} =			$zpl_barcode;
	$replacements{"[STREKKODE_TEKST]"} =		get_from_tag_first_string($message, 'print_barcode');
	$replacements{"[TERMINALNAVN]"} =		get_from_tag_first_string($message, 'terminal_name');
	$replacements{"[DATO_TID]"} =			get_from_tag_first_string($message, 'datestring_lbs');
	$replacements{"[UKEDAG]"} =			get_from_tag_first_string($message, 'weekday');
	$replacements{"[FORMAT]"} =			get_from_tag_first_string($message, 'product_params_format_text');
	$replacements{"[KODEFOREDLINGSGRAD]"} =		get_from_tag_first_string($message, 'product_params_process_degree_text');
	$replacements{"[FORE]"} =			get_from_tag_first_string($message, 'product_params_process_degree_text');
	$replacements{"[INTERNNUMMER]"} =		(defined $chute && $chute ne "0" ? "AVKAST: " . $chute : "INTERNNR: " . zerofill($internnr, 3));
	$replacements{"[BETEGNMERKING]"} =		get_from_tag_first_string($message, 'marking_text');
	$replacements{"[TILLEGGSMERKING]"} =		get_from_tag_first_string($message, 'marking_text_extra');
	$replacements{"[TILLEGGSMERKING_DIGITS]"} =	((get_from_tag_first_string($message, 'marking_text_extra') =~ s/^\D*(\d[\w\-_]+).*$/$1/rg) =~ s/_/./rg);
	$replacements{"[HJELPETEKST1]"} =		get_from_tag_first_string($message, 'marking_text_help_1');
	$replacements{"[HJELPETEKST2]"} =		get_from_tag_first_string($message, 'marking_text_help_2');
	$replacements{"[HJELPETEKST3]"} =		get_from_tag_first_string($message, 'marking_text_help_3');
	$replacements{"[VEKT]"} =			sprintf("%.1f", get_from_tag_first_string($message, 'weight'));
	$replacements{"[PNTIL]"} =			zerofill(get_from_tag_first_string($message, 'marking_postcode_id'), 4);
	$replacements{"[POSTADRESSEFRA]"} =		zerofill(get_from_tag_first_string($message, 'postcode'), 4) . " " . get_from_tag_first_string($message, 'postname');
	$replacements{"[ANTALL]"} =			(defined $tray_count && $tray_count ne "0" ? "ANTALL KASSETTER: $tray_count" : "");
	$replacements{"[PRODDAG]"} =			"";
	$replacements{"[BESKRIVELSE]"} =		get_from_tag_first_string($message,'client_description');

	# Remove spaces, zeros etc. from the marking_frequency value, only keep A and B
	$replacements{"[IDENTFREQVENS_A_OR_B]"} =	(get_from_tag_first_string($message,'marking_frequency') =~ s/[^AB]//gr);
	$replacements{"^FD&^FS"} =			"^FD" . (get_from_tag_first_string($message,'marking_frequency') =~ s/[^AB]//gr) . "^FS";
	
	foreach my $key (keys(%replacements)) {
		$replacements{$key} =~ s/\s+$//;
	}
	
	my $zpl_out = "";
		
	# Begins with ZPL, no C# code embedded in head? If so, do work immediately
	my $do_work = ($printer_template =~ /^\s*\^XA/ ? 1 : 0);
	foreach my $line (split /[\r\n]+/, $printer_template) {
		if ($line =~ /<<PRINT-SCRIPT START>>/) {
			$do_work = 1;
		}
		elsif ($line =~ /<<PRINT-SCRIPT END>>/) {
			$do_work = 0;
		}
		elsif ($do_work) {
			foreach my $key (keys(%replacements)) {
				if (defined ($replacements{$key})) {
					$line =~ s/\Q$key\E/$replacements{$key}/g;
				}
				else {
					$line =~ s/\Q$key\E//g;
				}
			}
			$zpl_out .= "$line\n";
		}
	}

	set_tag_blob($message, "response", $zpl_out);

	return send_label_message_raw($message, $printer_ip, $printer_ip_force, $printer_port, $printer_disable);
}

sub zerofill {
	my $subject = shift;
	my $total_characters = shift;

	if (!defined $subject) {
		return undef;
	}

	my $result = $subject;

	while (length $result < $total_characters) {
		$result = "0" . $result;
	}

	return $result;
}

sub source {
	return 1;
}

sub process {
	my $message = shift;

	my $printer_previous = get_from_tag_first($message, "printer_previous");
	if (defined $printer_previous) {
		print_error("Printing to $printer_previous failed, checking for failover printers\n");
	}

	my $print_count = get_from_tag_first($message, "printer_sorted_count");
	if (!defined $print_count) {
		print_error("Parameter printer_count not found in message to LBS print daemon\n");
		return 1;
	}

	if ($print_count == 0) {
		print_error("No printers defined for message, not printing.\n");
		return 1;
	}

	#print_info("In print process sub, printers: $print_count\n");

	my $printer_ip_force = get_from_tag_first($message, "printer_ip_force");
	my $printer_disable = get_from_tag_first($message, "print_disable");
	my $printer_failover = get_from_tag_first($message, "print_failover");

	for (my $i = 0; $i < $print_count; $i++) {
		my $key = "printer_sorted_" . $i;
		my $printer_ip = get_from_tag_first($message, $key . "_ip");
		my $printer_port = get_from_tag_first($message, $key . "_port");
		my $printer_template = get_from_tag_first($message, $key . "_template");

		if (defined ($printer_ip)) {
			# Try the first defined printer and remove it from the message
			$message->clear_tag($key . "_ip");
			$message->clear_tag($key . "_port");
			$message->clear_tag($key . "_template");

			# Add debug information to print if the message is returned due to
			# network failure
			$message->clear_tag("printer_previous");
			$message->push_tag_str("printer_previous", "$printer_ip:" . ensure_port($printer_port));

			if ($i == 0) {
				print_info("Printing barcode " . get_from_tag_first($message, 'print_barcode') . " to printer " .
					$printer_ip . ":" . ensure_port($printer_port) . "\n");
				return send_label_message($message, $printer_ip, $printer_ip_force, $printer_port, $printer_disable, $printer_template);
			}
			else {
				print_info("Printing barcode (failover) " . get_from_tag_first($message, 'print_barcode') . " to printer " .
					$printer_ip . ":" . ensure_port($printer_port) . "\n");
				# Message is a retry, it already contains the 'response' field with data
				return send_label_message_raw($message, $printer_ip, $printer_ip_force, $printer_port, $printer_disable);
			}
		}
		elsif (defined $printer_failover and $printer_failover =~ /no/) {
			last;
		}
	}

	print_error("No printers defined for message after retry or failover is disabled, it has not been printed.\n");

	return 1;
}
